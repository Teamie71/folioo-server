/* eslint-disable */
import { html, useState, useEffect, useCallback, useMemo } from '../lib/setup.js';
import { api, GRANT_SOURCE_LABELS, NOTICE_STATUS_LABELS, TICKET_TYPE_LABELS } from '../lib/api.js';
import { Badge } from '../components/Badge.js';
import { SearchToolbar } from '../components/Table.js';
import { Toast } from '../components/Toast.js';

const SOURCE_VARIANTS = {
    EVENT: 'event',
    SIGNUP: 'purchase',
    ADMIN: 'ticket',
    COMPENSATION: 'ticket',
    PURCHASE: 'purchase',
};

const NOTICE_VARIANTS = {
    PENDING: 'pending',
    SHOWN: 'available',
    DISMISSED: 'used',
};

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${MM}.${dd} ${HH}:${mm}`;
}

function rewardSummary(rewardSnapshot) {
    if (!rewardSnapshot || rewardSnapshot.length === 0) return '-';
    return rewardSnapshot.map((reward) => `${TICKET_TYPE_LABELS[reward.type] || reward.type} ${reward.quantity}회권`).join(' + ');
}

function TicketGrantTable({ items }) {
    if (items.length === 0) {
        return html`
            <div class="text-center py-16 text-gray-400 text-sm">
                지급/안내 이력이 없습니다
            </div>
        `;
    }

    return html`
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-gray-100/80">
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">유저</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">출처</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">보상</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">운영 사유</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">안내 상태</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">지급일</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">노출/닫힘</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, i) => {
                        const sourceLabel = GRANT_SOURCE_LABELS[item.sourceType] || item.sourceType;
                        const sourceVariant = SOURCE_VARIANTS[item.sourceType] || 'zero';
                        const noticeLabel = item.noticeStatus ? (NOTICE_STATUS_LABELS[item.noticeStatus] || item.noticeStatus) : '없음';
                        const noticeVariant = item.noticeStatus ? (NOTICE_VARIANTS[item.noticeStatus] || 'zero') : 'zero';

                        return html`
                            <tr key=${item.grantId}
                                class="border-b border-gray-100 hover:bg-primary-50/50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}">
                                <td class="px-4 py-3">
                                    <span class="font-medium">${item.userName}</span>
                                    <span class="text-gray-400 text-xs ml-1">#${item.userId}</span>
                                    <div class="text-gray-400 text-xs mt-1">${item.userEmail || '-'}</div>
                                </td>
                                <td class="px-4 py-3">
                                    <${Badge} variant=${sourceVariant}>${sourceLabel}<//>
                                </td>
                                <td class="px-4 py-3 text-gray-600 text-xs leading-relaxed">
                                    ${rewardSummary(item.rewardSnapshot)}
                                </td>
                                <td class="px-4 py-3 text-xs text-gray-500 leading-relaxed">
                                    ${item.reasonText || item.reasonCode || '-'}
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <${Badge} variant=${noticeVariant}>${noticeLabel}<//>
                                </td>
                                <td class="px-4 py-3 text-gray-500 text-xs tabular-nums">${formatDate(item.grantedAt)}</td>
                                <td class="px-4 py-3 text-gray-500 text-xs tabular-nums">
                                    <div>shown ${formatDate(item.noticeShownAt)}</div>
                                    <div class="mt-1">dismiss ${formatDate(item.noticeDismissedAt)}</div>
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        </div>
    `;
}

export function TicketGrantHistoryTab() {
    const [grants, setGrants] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [noticeFilter, setNoticeFilter] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    const showToast = useCallback((message, type) => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    }, []);

    const loadGrants = useCallback(async () => {
        try {
            const result = await api('/admin/api/ticket-grants');
            setGrants(result.grants);
        } catch (err) {
            showToast(err.message, 'error');
        }
    }, [showToast]);

    useEffect(() => {
        loadGrants();
    }, [loadGrants]);

    const filteredGrants = useMemo(() => {
        if (!grants) return [];

        return grants.filter((item) => {
            if (keyword) {
                const kw = keyword.toLowerCase();
                const reasonText = (item.reasonText || item.reasonCode || '').toLowerCase();
                if (
                    !item.userName.toLowerCase().includes(kw) &&
                    !(item.userEmail && item.userEmail.toLowerCase().includes(kw)) &&
                    !reasonText.includes(kw)
                ) {
                    return false;
                }
            }

            if (sourceFilter && item.sourceType !== sourceFilter) return false;
            if (noticeFilter) {
                if (noticeFilter === 'NONE') {
                    if (item.noticeStatus) return false;
                } else if (item.noticeStatus !== noticeFilter) {
                    return false;
                }
            }

            return true;
        });
    }, [grants, keyword, sourceFilter, noticeFilter]);

    return html`
        <${React.Fragment}>
            <${SearchToolbar}
                keyword=${keyword}
                onKeywordChange=${setKeyword}
                onSearch=${loadGrants}
                total=${grants ? filteredGrants.length : null}
                loading=${grants === null}
                countLabel="건"
            />

            <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4 flex gap-3 items-center flex-wrap">
                <span class="text-sm font-semibold text-gray-500 whitespace-nowrap">필터</span>
                <select value=${sourceFilter}
                        onChange=${(e) => setSourceFilter(e.target.value)}
                        class="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500">
                    <option value="">출처 전체</option>
                    ${Object.entries(GRANT_SOURCE_LABELS).map(([value, label]) => html`<option key=${value} value=${value}>${label}</option>`)}
                </select>
                <select value=${noticeFilter}
                        onChange=${(e) => setNoticeFilter(e.target.value)}
                        class="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500">
                    <option value="">안내 전체</option>
                    <option value="NONE">안내 없음</option>
                    ${Object.entries(NOTICE_STATUS_LABELS).map(([value, label]) => html`<option key=${value} value=${value}>${label}</option>`)}
                </select>
                <button onClick=${loadGrants}
                        class="px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-full hover:bg-primary-600 transition-colors whitespace-nowrap">
                    새로고침
                </button>
            </div>

            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                ${grants === null
                    ? html`<div class="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>`
                    : html`<${TicketGrantTable} items=${filteredGrants} />`}
            </div>

            <${Toast} message=${toast.message} type=${toast.type} visible=${toast.visible} />
        <//>
    `;
}
