/* eslint-disable */
// Folioo Admin Dashboard — React 18 + htm + Tailwind CSS (CDN, no build)
const { useState, useEffect, useCallback, useRef } = React;
const html = htm.bind(React.createElement);

// ─── Constants ───────────────────────────────────────────────
const TICKET_TYPE_LABELS = {
    EXPERIENCE: '경험 정리',
    PORTFOLIO_CORRECTION: '포트폴리오 첨삭',
};

const GRANT_REASONS = [
    '피드백 제출',
    '인사이트 로그 작성 챌린지',
    '서비스 이용 불편에 대한 보상',
];

const TABS = [
    { id: 'users', label: '회원 관리', enabled: true },
    { id: 'tickets', label: '이용권 거래 내역', enabled: false },
    { id: 'events', label: '이벤트 모달 관리', enabled: false },
];

// ─── API helpers ─────────────────────────────────────────────
async function api(url, options) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!data.isSuccess) {
        throw new Error(data.error?.reason ?? data.error?.message ?? '요청에 실패했습니다');
    }
    return data.result;
}

// ─── Toast Component ─────────────────────────────────────────
function Toast({ message, type, visible }) {
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    const stateClass = visible ? 'toast-active' : 'toast-enter';
    return html`
        <div class="fixed bottom-8 left-1/2 ${bgColor} text-white px-5 py-3 rounded-xl
                    text-sm font-semibold shadow-lg z-50 transition-all duration-300
                    max-w-[90%] whitespace-nowrap ${stateClass}"
             style="pointer-events: none;">
            ${message}
        </div>
    `;
}

// ─── Loading Bar ─────────────────────────────────────────────
function LoadingBar({ loading }) {
    if (!loading) return null;
    return html`<div class="loading-bar" style="width: 70%; display: block;"></div>`;
}

// ─── Badge Component ─────────────────────────────────────────
function Badge({ children, variant }) {
    const styles = {
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-red-100 text-red-600',
        login: 'bg-blue-100 text-blue-700',
        ticket: 'bg-primary-50 text-primary-600',
        zero: 'bg-gray-100 text-gray-400',
    };
    return html`
        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[variant] || styles.active}">
            ${children}
        </span>
    `;
}

// ─── Modal Component ─────────────────────────────────────────
function Modal({ open, onClose, children }) {
    if (!open) return null;
    return html`
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-40"
             onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-[90%] p-6
                        animate-[fadeIn_0.2s_ease]">
                ${children}
            </div>
        </div>
    `;
}

// ─── GrantTicketModal ────────────────────────────────────────
function GrantTicketModal({ open, user, onClose, onSuccess }) {
    const [type, setType] = useState('EXPERIENCE');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState(GRANT_REASONS[0]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('form'); // 'form' | 'confirm'

    // Reset on open
    useEffect(() => {
        if (open) {
            setType('EXPERIENCE');
            setQuantity(1);
            setReason(GRANT_REASONS[0]);
            setStep('form');
            setLoading(false);
        }
    }, [open]);

    if (!user) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const result = await api('/admin/api/tickets/grant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId, type, quantity, reason }),
            });
            onSuccess(user.name, TICKET_TYPE_LABELS[type], quantity, result.remainingBalance);
            onClose();
        } catch (err) {
            onSuccess(null, null, null, null, err.message);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <${Modal} open=${open} onClose=${onClose}>
            ${step === 'form' ? html`
                <h3 class="text-lg font-bold mb-1">이용권 지급</h3>
                <p class="text-sm text-gray-500 mb-5">
                    <span class="font-semibold text-gray-800">${user.name}</span>
                    <span class="text-xs text-gray-400 ml-1">(ID: ${user.userId})</span>
                    님에게 이용권을 지급합니다.
                </p>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">이용권 종류</label>
                        <select value=${type} onChange=${(e) => setType(e.target.value)}
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
                            <option value="EXPERIENCE">경험 정리</option>
                            <option value="PORTFOLIO_CORRECTION">포트폴리오 첨삭</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">수량</label>
                        <select value=${quantity} onChange=${(e) => setQuantity(Number(e.target.value))}
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
                            ${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
                                html`<option key=${n} value=${n}>${n}개</option>`
                            )}
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">지급 사유</label>
                        <select value=${reason} onChange=${(e) => setReason(e.target.value)}
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
                            ${GRANT_REASONS.map(r =>
                                html`<option key=${r} value=${r}>${r}</option>`
                            )}
                        </select>
                    </div>
                </div>

                <div class="flex gap-3 justify-end mt-6">
                    <button onClick=${onClose}
                            class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300
                                   rounded-lg hover:bg-gray-50">
                        취소
                    </button>
                    <button onClick=${() => setStep('confirm')}
                            class="px-4 py-2 text-sm font-semibold text-white bg-primary-500
                                   rounded-lg hover:bg-primary-600">
                        다음
                    </button>
                </div>
            ` : html`
                <h3 class="text-lg font-bold mb-4">지급 확인</h3>

                <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-5">
                    <div class="flex justify-between">
                        <span class="text-gray-500">대상</span>
                        <span class="font-semibold">${user.name} (ID: ${user.userId})</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">이용권</span>
                        <span class="font-semibold">${TICKET_TYPE_LABELS[type]}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">수량</span>
                        <span class="font-semibold text-primary-600">${quantity}개</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">사유</span>
                        <span class="font-semibold">${reason}</span>
                    </div>
                </div>

                <div class="flex gap-3 justify-end">
                    <button onClick=${() => setStep('form')} disabled=${loading}
                            class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300
                                   rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        이전
                    </button>
                    <button onClick=${handleSubmit} disabled=${loading}
                            class="px-5 py-2 text-sm font-semibold text-white bg-primary-500
                                   rounded-lg hover:bg-primary-600 disabled:bg-gray-300
                                   disabled:cursor-not-allowed flex items-center gap-1.5">
                        ${loading ? html`
                            <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent
                                         rounded-full animate-spin"></span>
                            처리 중
                        ` : '지급하기'}
                    </button>
                </div>
            `}
        <//>
    `;
}

// ─── UserTable ───────────────────────────────────────────────
function UserTable({ users, onGrant }) {
    if (!users || users.length === 0) {
        return html`
            <div class="text-center py-16 text-gray-400 text-sm">
                사용자가 없습니다
            </div>
        `;
    }

    return html`
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-gray-100/80">
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">ID</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">이름</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">이메일</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">로그인</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">상태</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">경험 정리</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">첨삭</th>
                        <th class="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap"></th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map((u, i) => html`
                        <tr key=${u.userId}
                            class="border-b border-gray-100 hover:bg-primary-50/50 transition-colors
                                   ${i % 2 === 1 ? 'bg-gray-50/50' : ''}">
                            <td class="px-4 py-3 text-gray-400 tabular-nums">${u.userId}</td>
                            <td class="px-4 py-3 font-medium">${u.name}</td>
                            <td class="px-4 py-3 text-gray-500 text-xs">${u.email || '-'}</td>
                            <td class="px-4 py-3">
                                ${u.loginType
                                    ? html`<${Badge} variant="login">${u.loginType}<//>`
                                    : '-'}
                            </td>
                            <td class="px-4 py-3">
                                <${Badge} variant=${u.isActive ? 'active' : 'inactive'}>
                                    ${u.isActive ? '활성' : '비활성'}
                                <//>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <${Badge} variant=${u.experienceTickets > 0 ? 'ticket' : 'zero'}>
                                    ${u.experienceTickets}
                                <//>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <${Badge} variant=${u.correctionTickets > 0 ? 'ticket' : 'zero'}>
                                    ${u.correctionTickets}
                                <//>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <button onClick=${() => onGrant(u)}
                                        class="px-3 py-1.5 text-xs font-semibold text-primary-500
                                               bg-primary-50 border border-primary-500 rounded-full
                                               hover:bg-primary-100 transition-colors whitespace-nowrap">
                                    이용권 지급
                                </button>
                            </td>
                        </tr>
                    `)}
                </tbody>
            </table>
        </div>
    `;
}

// ─── SearchToolbar ───────────────────────────────────────────
function SearchToolbar({ keyword, onKeywordChange, onSearch, total, loading }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') onSearch();
    };

    return html`
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4
                    flex gap-3 items-center flex-wrap">
            <span class="text-sm font-semibold text-gray-500 whitespace-nowrap">검색</span>
            <input type="text" value=${keyword}
                   onInput=${(e) => onKeywordChange(e.target.value)}
                   onKeyDown=${handleKeyDown}
                   placeholder="이름 또는 이메일로 검색..."
                   class="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2
                          text-sm outline-none focus:border-primary-500
                          placeholder:text-gray-400" />
            <button onClick=${onSearch} disabled=${loading}
                    class="px-5 py-2 bg-primary-500 text-white text-sm font-semibold
                           rounded-full hover:bg-primary-600 disabled:bg-gray-300
                           disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                검색
            </button>
            ${total !== null ? html`
                <span class="text-sm text-gray-400 ml-auto">
                    총 <strong class="text-primary-500">${total}</strong>명
                </span>
            ` : null}
        </div>
    `;
}

// ─── UserManagementTab ───────────────────────────────────────
function UserManagementTab() {
    const [users, setUsers] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    const showToast = useCallback((message, type) => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
    }, []);

    const loadUsers = useCallback(async (searchKeyword) => {
        setLoading(true);
        try {
            const params = searchKeyword ? `?keyword=${encodeURIComponent(searchKeyword)}` : '';
            const result = await api(`/admin/api/users/search${params}`);
            setUsers(result.users);
            setTotal(result.total);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleGrant = (user) => {
        setSelectedUser(user);
        setModalOpen(true);
    };

    const handleGrantSuccess = (name, typeLabel, qty, remaining, errorMsg) => {
        if (errorMsg) {
            showToast(errorMsg, 'error');
            return;
        }
        showToast(
            `${name}님에게 ${typeLabel} ${qty}개 지급 완료 (잔여: ${remaining}개)`,
            'success'
        );
        loadUsers(keyword || undefined);
    };

    return html`
        <${SearchToolbar}
            keyword=${keyword}
            onKeywordChange=${setKeyword}
            onSearch=${() => loadUsers(keyword || undefined)}
            total=${total}
            loading=${loading}
        />

        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            ${users === null ? html`
                <div class="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
            ` : html`
                <${UserTable} users=${users} onGrant=${handleGrant} />
            `}
        </div>

        <${GrantTicketModal}
            open=${modalOpen}
            user=${selectedUser}
            onClose=${() => setModalOpen(false)}
            onSuccess=${handleGrantSuccess}
        />

        <${Toast} message=${toast.message} type=${toast.type} visible=${toast.visible} />
    `;
}

// ─── ComingSoonTab ───────────────────────────────────────────
function ComingSoonTab({ title }) {
    return html`
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm
                    flex flex-col items-center justify-center py-24">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
            </div>
            <p class="text-gray-400 text-sm font-medium">${title}</p>
            <p class="text-gray-300 text-xs mt-1">준비 중입니다</p>
        </div>
    `;
}

// ─── TabNav ──────────────────────────────────────────────────
function TabNav({ activeTab, onTabChange }) {
    return html`
        <div class="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            ${TABS.map(tab => html`
                <button key=${tab.id}
                        onClick=${() => tab.enabled && onTabChange(tab.id)}
                        disabled=${!tab.enabled}
                        class="flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all
                               ${activeTab === tab.id
                                   ? 'bg-primary-500 text-white shadow-sm'
                                   : tab.enabled
                                       ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                       : 'text-gray-300 cursor-not-allowed'}">
                    ${tab.label}
                    ${!tab.enabled ? html`<span class="ml-1 text-[10px] opacity-60">Soon</span>` : null}
                </button>
            `)}
        </div>
    `;
}

// ─── Header ──────────────────────────────────────────────────
function Header() {
    return html`
        <div class="flex items-center gap-3 mb-5">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center
                        text-white font-bold text-sm">
                F
            </div>
            <h1 class="text-xl font-bold">Folioo Admin</h1>
            <span class="text-xs bg-primary-50 text-primary-500 px-2.5 py-0.5
                         rounded-full font-semibold">
                Dashboard
            </span>
        </div>
    `;
}

// ─── App ─────────────────────────────────────────────────────
function App() {
    const [activeTab, setActiveTab] = useState('users');

    return html`
        <div class="max-w-[1200px] mx-auto p-6">
            <${Header} />
            <${TabNav} activeTab=${activeTab} onTabChange=${setActiveTab} />

            ${activeTab === 'users' && html`<${UserManagementTab} />`}
            ${activeTab === 'tickets' && html`<${ComingSoonTab} title="이용권 거래 내역" />`}
            ${activeTab === 'events' && html`<${ComingSoonTab} title="이벤트 모달 관리" />`}
        </div>
    `;
}

// ─── Mount ───────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
