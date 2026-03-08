/* eslint-disable */
import { html, useState, useEffect, useCallback } from '../lib/setup.js';
import { api } from '../lib/api.js';
import { UserTable, SearchToolbar } from '../components/Table.js';
import { GrantEventRewardModal, GrantTicketModal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export function UserManagementTab() {
    const [users, setUsers] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [ticketModalOpen, setTicketModalOpen] = useState(false);
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    const showToast = useCallback((message, type) => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    }, []);

    const loadUsers = useCallback(
        async (searchKeyword) => {
            setLoading(true);
            try {
                const params = searchKeyword
                    ? `?keyword=${encodeURIComponent(searchKeyword)}`
                    : '';
                const result = await api(`/admin/api/users/search${params}`);
                setUsers(result.users);
                setTotal(result.total);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                setLoading(false);
            }
        },
        [showToast]
    );

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleGrant = (user) => {
        setSelectedUser(user);
        setTicketModalOpen(true);
    };

    const handleEventGrant = (user) => {
        setSelectedUser(user);
        setEventModalOpen(true);
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

    const handleEventGrantSuccess = (name, eventCode, grantedAt, errorMsg) => {
        if (errorMsg) {
            showToast(errorMsg, 'error');
            return;
        }
        showToast(
            `${name}님에게 ${eventCode} 이벤트 보상 지급 완료 (${new Date(grantedAt).toLocaleString('ko-KR')})`,
            'success'
        );
        loadUsers(keyword || undefined);
    };

    return html`
        <${React.Fragment}>
            <${SearchToolbar}
                keyword=${keyword}
                onKeywordChange=${setKeyword}
                onSearch=${() => loadUsers(keyword || undefined)}
                total=${total}
                loading=${loading}
            />

            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                ${users === null
                    ? html`<div class="text-center py-16 text-gray-400 text-sm">
                          불러오는 중...
                      </div>`
                    : html`<${UserTable} users=${users} onGrant=${handleGrant} onEventGrant=${handleEventGrant} />`}
            </div>

            <${GrantTicketModal}
                open=${ticketModalOpen}
                user=${selectedUser}
                onClose=${() => setTicketModalOpen(false)}
                onSuccess=${handleGrantSuccess}
            />

            <${GrantEventRewardModal}
                open=${eventModalOpen}
                user=${selectedUser}
                onClose=${() => setEventModalOpen(false)}
                onSuccess=${handleEventGrantSuccess}
            />

            <${Toast} message=${toast.message} type=${toast.type} visible=${toast.visible} />
        <//>
    `;
}
