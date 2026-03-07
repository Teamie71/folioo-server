/* eslint-disable */
import { html, useState, useEffect, useCallback, useMemo } from '../lib/setup.js';
import { api, TICKET_TYPE_LABELS } from '../lib/api.js';
import { Badge } from '../components/Badge.js';
import { Toast } from '../components/Toast.js';

const STATUS_CONFIG = {
    AVAILABLE: { label: '보유 중', variant: 'available' },
    USED: { label: '사용', variant: 'used' },
    EXPIRED: { label: '만료', variant: 'expired' },
};

const SOURCE_CONFIG = {
    PURCHASE: { label: '구매', variant: 'purchase' },
    EVENT: { label: '이벤트', variant: 'event' },
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

function TicketHistoryTable({ items }) {
    if (items.length === 0) {
        return html`
            <div class="text-center py-16 text-gray-400 text-sm">
                거래 내역이 없습니다
            </div>
        `;
    }

    return html`
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-gray-100/80">
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">유저</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">이메일</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">이용권</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">구분</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">상태</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">발급일</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">사용/만료일</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((t, i) => {
                        const statusCfg = STATUS_CONFIG[t.status] || { label: t.status, variant: 'zero' };
                        const sourceCfg = SOURCE_CONFIG[t.source] || { label: t.source, variant: 'zero' };
                        const actionDate = t.usedAt || t.expiredAt;

                        return html`
                            <tr key=${t.ticketId}
                                class="border-b border-gray-100 hover:bg-primary-50/50 transition-colors
                                       ${i % 2 === 1 ? 'bg-gray-50/50' : ''}">
                                <td class="px-4 py-3">
                                    <span class="font-medium">${t.userName}</span>
                                    <span class="text-gray-400 text-xs ml-1">#${t.userId}</span>
                                </td>
                                <td class="px-4 py-3 text-gray-500 text-xs">${t.userEmail || '-'}</td>
                                <td class="px-4 py-3 text-center">
                                    <${Badge} variant="ticket">
                                        ${TICKET_TYPE_LABELS[t.type] || t.type}
                                    <//>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <${Badge} variant=${sourceCfg.variant}>${sourceCfg.label}<//>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <${Badge} variant=${statusCfg.variant}>${statusCfg.label}<//>
                                </td>
                                <td class="px-4 py-3 text-gray-500 text-xs tabular-nums">${formatDate(t.createdAt)}</td>
                                <td class="px-4 py-3 text-gray-500 text-xs tabular-nums">${formatDate(actionDate)}</td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        </div>
    `;
}

export function TicketHistoryTab() {
    const [history, setHistory] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
    const [filter, setFilter] = useState({ keyword: '', status: '', source: '' });

    const showToast = useCallback((message, type) => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    }, []);

    const loadHistory = useCallback(async () => {
        try {
            const result = await api('/admin/api/tickets/history');
            setHistory(result.history);
        } catch (err) {
            showToast(err.message, 'error');
        }
    }, [showToast]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const filteredHistory = useMemo(() => {
        if (!history) return [];
        return history.filter((t) => {
            if (filter.keyword) {
                const kw = filter.keyword.toLowerCase();
                if (
                    !t.userName.toLowerCase().includes(kw) &&
                    !(t.userEmail && t.userEmail.toLowerCase().includes(kw))
                )
                    return false;
            }
            if (filter.status && t.status !== filter.status) return false;
            if (filter.source && t.source !== filter.source) return false;
            return true;
        });
    }, [history, filter]);

    return html`
        <${React.Fragment}>
            <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4
                        flex gap-3 items-center flex-wrap">
                <span class="text-sm font-semibold text-gray-500 whitespace-nowrap">필터</span>
                <input type="text" value=${filter.keyword}
                       onInput=${(e) => setFilter((f) => ({ ...f, keyword: e.target.value }))}
                       placeholder="이름 또는 이메일..."
                       class="min-w-[160px] border border-gray-300 rounded-lg px-3 py-2
                              text-sm outline-none focus:border-primary-500 placeholder:text-gray-400" />
                <select value=${filter.source}
                        onChange=${(e) => setFilter((f) => ({ ...f, source: e.target.value }))}
                        class="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none
                               focus:border-primary-500">
                    <option value="">구분 전체</option>
                    <option value="PURCHASE">구매</option>
                    <option value="EVENT">이벤트</option>
                </select>
                <select value=${filter.status}
                        onChange=${(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
                        class="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none
                               focus:border-primary-500">
                    <option value="">상태 전체</option>
                    <option value="AVAILABLE">보유 중</option>
                    <option value="USED">사용</option>
                    <option value="EXPIRED">만료</option>
                </select>
                <button onClick=${loadHistory}
                        class="px-4 py-2 bg-primary-500 text-white text-sm font-semibold
                               rounded-full hover:bg-primary-600 transition-colors whitespace-nowrap">
                    새로고침
                </button>
                ${history !== null ? html`
                    <span class="text-sm text-gray-400 ml-auto">
                        총 <strong class="text-primary-500">${filteredHistory.length}</strong>건
                    </span>
                ` : null}
            </div>

            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                ${history === null
                    ? html`<div class="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>`
                    : html`<${TicketHistoryTable} items=${filteredHistory} />`}
            </div>

            <${Toast} message=${toast.message} type=${toast.type} visible=${toast.visible} />
        <//>
    `;
}
