/* eslint-disable */
import { html, useState, useEffect } from '../lib/setup.js';
import { TICKET_TYPE_LABELS, GRANT_REASONS, api } from '../lib/api.js';

export function Modal({ open, onClose, children }) {
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

export function GrantTicketModal({ open, user, onClose, onSuccess }) {
    const [type, setType] = useState('EXPERIENCE');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState(GRANT_REASONS[0]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('form');

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

    const formView = html`
        <${React.Fragment}>
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
        <//>
    `;

    const confirmView = html`
        <${React.Fragment}>
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
                        <${React.Fragment}>
                            <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent
                                         rounded-full animate-spin"></span>
                            처리 중
                        <//>
                    ` : '지급하기'}
                </button>
            </div>
        <//>
    `;

    return html`
        <${Modal} open=${open} onClose=${onClose}>
            ${step === 'form' ? formView : confirmView}
        <//>
    `;
}
