/* eslint-disable */
import { html, useState, useEffect } from '../lib/setup.js';
import { TICKET_TYPE_LABELS, GRANT_REASONS, api } from '../lib/api.js';

function normalizeDisplayReason(displayReason) {
    const trimmedDisplayReason = displayReason?.trim();
    if (!trimmedDisplayReason) return '';
    if (trimmedDisplayReason === '서비스 이용 불편에 대한 보상') {
        return '서비스 이용 불편에 대한';
    }
    return trimmedDisplayReason;
}

function formatRewardSummary(typeLabel, quantity) {
    return `${typeLabel} ${quantity}회권`;
}

function buildDefaultNoticeBody(typeLabel, quantity) {
    return `${formatRewardSummary(typeLabel, quantity)}이 지급되었어요.`;
}

function useNoticeFormState(open) {
    const [createNotice, setCreateNotice] = useState(true);
    const [displayReason, setDisplayReason] = useState(GRANT_REASONS[0]);
    const [noticeTitle, setNoticeTitle] = useState('보상이 지급되었어요');
    const [noticeBody, setNoticeBody] = useState('');
    const [noticeCtaText, setNoticeCtaText] = useState('');
    const [noticeCtaLink, setNoticeCtaLink] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setCreateNotice(true);
            setDisplayReason(GRANT_REASONS[0]);
            setNoticeTitle('보상이 지급되었어요');
            setNoticeBody('');
            setNoticeCtaText('');
            setNoticeCtaLink('');
            setDetailsOpen(false);
        }
    }, [open]);

    return {
        createNotice,
        setCreateNotice,
        displayReason,
        setDisplayReason,
        noticeTitle,
        setNoticeTitle,
        noticeBody,
        setNoticeBody,
        noticeCtaText,
        setNoticeCtaText,
        noticeCtaLink,
        setNoticeCtaLink,
        detailsOpen,
        setDetailsOpen,
    };
}

function NoticeFormFields({
    createNotice,
    setCreateNotice,
    displayReason,
    setDisplayReason,
    noticeTitle,
    setNoticeTitle,
    noticeBody,
    setNoticeBody,
    noticeCtaText,
    setNoticeCtaText,
    noticeCtaLink,
    setNoticeCtaLink,
    detailsOpen,
    setDetailsOpen,
    previewBody,
    summaryText,
    previewVariant,
    ctaLinkPlaceholder,
    displayReasonReadonly,
    displayReasonReadonlyLabel,
    embedded,
}) {
    const previewStyle =
        previewVariant === 'amber'
            ? 'rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-gray-600'
            : 'rounded-xl bg-primary-50 border border-primary-100 p-3 text-xs text-gray-600';
    const previewTitleStyle = previewVariant === 'amber' ? 'font-semibold text-amber-600 mb-1' : 'font-semibold text-primary-600 mb-1';

    return html`
        <div class=${embedded ? 'space-y-4' : 'border-t border-gray-200 pt-4 space-y-4'}>
            <label class="flex items-center justify-between gap-3">
                <span>
                    <span class="block text-sm font-semibold text-gray-600">보상 안내 모달 생성</span>
                    <span class="block text-xs text-gray-400 mt-1">
                        사용자가 다음 접속 시 보상 안내를 보게 합니다.
                    </span>
                </span>
                <input type="checkbox" checked=${createNotice}
                       onChange=${(e) => setCreateNotice(e.target.checked)}
                       class="w-4 h-4 accent-primary-500" />
            </label>

            ${createNotice ? html`
                <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                    ${displayReasonReadonly ? html`
                        <div>
                            <label class="block text-sm font-semibold text-gray-600 mb-1.5">${displayReasonReadonlyLabel || '사용자 노출 사유'}</label>
                            <div class="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
                                ${normalizeDisplayReason(displayReason) || '-'}
                            </div>
                        </div>
                    ` : html`
                        <div>
                            <label class="block text-sm font-semibold text-gray-600 mb-1.5">사용자 노출 사유</label>
                            <select value=${displayReason} onChange=${(e) => setDisplayReason(e.target.value)}
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                           focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
                                ${GRANT_REASONS.map(r => html`<option key=${r} value=${r}>${r}</option>`)}
                            </select>
                        </div>
                    `}
                    <button type="button"
                            onClick=${() => setDetailsOpen(!detailsOpen)}
                            class="mt-7 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap">
                        ${detailsOpen ? '고급 설정 닫기' : '고급 설정'}
                    </button>
                </div>

                <div class=${previewStyle}>
                    <div class=${previewTitleStyle}>미리보기</div>
                    <div class="font-medium text-gray-800">${noticeTitle || '보상이 지급되었어요'}</div>
                    <div class="mt-1 text-[11px] text-gray-500">${normalizeDisplayReason(displayReason) || '표시 사유 없음'}</div>
                    <div class="mt-1 leading-relaxed">${previewBody}</div>
                    <div class="mt-1 text-[11px] text-gray-500">${summaryText}</div>
                </div>

                ${detailsOpen ? html`
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-semibold text-gray-600 mb-1.5">모달 제목</label>
                            <input type="text" value=${noticeTitle}
                                   onInput=${(e) => setNoticeTitle(e.target.value)}
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                          focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                                   placeholder="보상이 지급되었어요" />
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-600 mb-1.5">CTA 문구 (선택)</label>
                            <input type="text" value=${noticeCtaText}
                                   onInput=${(e) => setNoticeCtaText(e.target.value)}
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                          focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                                   placeholder="예: 보러가기" />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">모달 본문 (선택)</label>
                        <textarea value=${noticeBody}
                                  onInput=${(e) => setNoticeBody(e.target.value)}
                                  rows="2"
                                  class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                         focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
                                  placeholder="비워두면 서버 규칙으로 기본 문구가 생성됩니다."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">CTA 링크 (선택)</label>
                        <input type="text" value=${noticeCtaLink}
                               onInput=${(e) => setNoticeCtaLink(e.target.value)}
                               class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                                      focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                               placeholder=${ctaLinkPlaceholder} />
                    </div>
                ` : null}
            ` : null}
        </div>
    `;
}

export function Modal({ open, onClose, children, panelClassName = 'max-w-md' }) {
    if (!open) return null;

    return html`
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-40"
             onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div class=${`bg-white rounded-2xl shadow-2xl ${panelClassName} w-[90%] max-h-[85vh] overflow-y-auto p-6
                        animate-[fadeIn_0.2s_ease]`}>
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
    const noticeForm = useNoticeFormState(open);

    useEffect(() => {
        if (open) {
            setType('EXPERIENCE');
            setQuantity(1);
            setReason(GRANT_REASONS[0]);
            setStep('form');
            setLoading(false);
        }
    }, [open]);

    useEffect(() => {
        noticeForm.setDisplayReason(reason);
    }, [reason]);

    if (!user) return null;

    const noticePreviewBody =
        noticeForm.noticeBody || buildDefaultNoticeBody(TICKET_TYPE_LABELS[type], quantity);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const result = await api('/admin/api/tickets/grant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    type,
                    quantity,
                    reason,
                    createNotice: noticeForm.createNotice,
                    displayReason: noticeForm.createNotice ? noticeForm.displayReason : undefined,
                    noticeTitle: noticeForm.createNotice ? noticeForm.noticeTitle : undefined,
                    noticeBody:
                        noticeForm.createNotice && noticeForm.noticeBody
                            ? noticeForm.noticeBody
                            : undefined,
                    noticeCtaText:
                        noticeForm.createNotice && noticeForm.noticeCtaText
                            ? noticeForm.noticeCtaText
                            : undefined,
                    noticeCtaLink:
                        noticeForm.createNotice && noticeForm.noticeCtaLink
                            ? noticeForm.noticeCtaLink
                            : undefined,
                }),
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

                <${NoticeFormFields}
                    ...${noticeForm}
                    previewBody=${noticePreviewBody}
                    summaryText=${`기본 표시 사유: ${normalizeDisplayReason(noticeForm.displayReason) || '없음'}`}
                    previewVariant="primary"
                    ctaLinkPlaceholder="예: /tickets"
                />
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
                <div class="flex justify-between items-start gap-3">
                    <span class="text-gray-500">보상 안내</span>
                    <span class="font-semibold text-right">
                        ${noticeForm.createNotice ? '생성' : '생성 안 함'}
                        ${noticeForm.createNotice ? html`<span class="block text-xs font-normal text-gray-500 mt-1">${noticeForm.noticeTitle || '보상이 지급되었어요'}</span>` : null}
                    </span>
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
        <${Modal} open=${open} onClose=${onClose} panelClassName="max-w-5xl">
            ${step === 'form' ? formView : confirmView}
        <//>
    `;
}

export function GrantEventRewardModal({ open, user, eventOptions, onClose, onSuccess }) {
    const [eventCode, setEventCode] = useState('');
    const [reviewedBy, setReviewedBy] = useState('김수빈');
    const [externalSubmissionId, setExternalSubmissionId] = useState('');
    const [reviewNote, setReviewNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('form');
    const noticeForm = useNoticeFormState(open);
    const selectedEvent = (eventOptions || []).find((event) => event.code === eventCode) || null;

    useEffect(() => {
        if (open) {
            setEventCode('');
            setReviewedBy('김수빈');
            setExternalSubmissionId('');
            setReviewNote('');
            setStep('form');
            setLoading(false);
        }
    }, [open]);

    useEffect(() => {
        noticeForm.setDisplayReason(selectedEvent?.title ?? '');
    }, [selectedEvent]);

    if (!user) return null;

    const previewBody =
        noticeForm.noticeBody || '기본 문구는 서버가 이벤트명과 이용권 규칙으로 자동 생성합니다.';

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const result = await api(`/admin/api/events/${encodeURIComponent(eventCode)}/grants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    reviewedBy: reviewedBy || undefined,
                    externalSubmissionId: externalSubmissionId || undefined,
                    reviewNote: reviewNote || undefined,
                    createNotice: noticeForm.createNotice,
                    displayReason: noticeForm.createNotice ? noticeForm.displayReason : undefined,
                    noticeTitle: noticeForm.createNotice ? noticeForm.noticeTitle : undefined,
                    noticeBody:
                        noticeForm.createNotice && noticeForm.noticeBody
                            ? noticeForm.noticeBody
                            : undefined,
                    noticeCtaText:
                        noticeForm.createNotice && noticeForm.noticeCtaText
                            ? noticeForm.noticeCtaText
                            : undefined,
                    noticeCtaLink:
                        noticeForm.createNotice && noticeForm.noticeCtaLink
                            ? noticeForm.noticeCtaLink
                            : undefined,
                }),
            });
            onSuccess(user.name, eventCode, result.rewardGrantedAt);
            onClose();
        } catch (err) {
            onSuccess(null, null, null, err.message);
        } finally {
            setLoading(false);
        }
    };

    const formView = html`
        <${React.Fragment}>
            <h3 class="text-lg font-bold mb-1">이벤트 보상 지급</h3>
            <p class="text-sm text-gray-500 mb-5">
                <span class="font-semibold text-gray-800">${user.name}</span>
                <span class="text-xs text-gray-400 ml-1">(ID: ${user.userId})</span>
                님에게 이벤트 보상을 지급합니다.
            </p>

            <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] gap-4 items-start">
                <div class="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">이벤트 코드</label>
                        <select value=${eventCode}
                                onChange=${(e) => setEventCode(e.target.value)}
                                class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm
                                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
                            <option value="">이벤트 선택</option>
                            ${(eventOptions || []).map((event) => html`<option key=${event.code} value=${event.code}>${event.title} (${event.code})</option>`)}
                        </select>
                        <p class="text-xs text-gray-400 mt-1">수동 보상이 허용된 활성 이벤트만 표시됩니다.</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-semibold text-gray-600 mb-1.5">검토자</label>
                            <input type="text" value=${reviewedBy}
                                   onInput=${(e) => setReviewedBy(e.target.value)}
                                   class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm
                                          focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                                   placeholder="김수빈" />
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-600 mb-1.5">외부 제출 ID (선택)</label>
                            <input type="text" value=${externalSubmissionId}
                                   onInput=${(e) => setExternalSubmissionId(e.target.value)}
                                   class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm
                                          focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                                   placeholder="예: google-form-row-123" />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">검토 메모 (선택)</label>
                        <textarea value=${reviewNote}
                                  onInput=${(e) => setReviewNote(e.target.value)}
                                  rows="3"
                                  class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm
                                         focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
                                  placeholder="예: 유효 피드백 확인 완료"></textarea>
                    </div>
                </div>

                <div class="rounded-2xl border border-amber-100 bg-white p-4">
                    <${NoticeFormFields}
                        ...${noticeForm}
                        previewBody=${previewBody}
                        summaryText="기본 표시 사유와 이용권 문구는 서버 규칙으로 자동 생성됩니다."
                        previewVariant="amber"
                        ctaLinkPlaceholder="예: /insights"
                        displayReasonReadonly=${true}
                        displayReasonReadonlyLabel="표시 이벤트명"
                        embedded=${true}
                    />
                </div>
            </div>

            <div class="flex gap-3 justify-end mt-6">
                <button onClick=${onClose}
                        class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                    취소
                </button>
                <button onClick=${() => setStep('confirm')} disabled=${!eventCode.trim()}
                        class="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                    다음
                </button>
            </div>
        <//>
    `;

    const confirmView = html`
        <${React.Fragment}>
            <h3 class="text-lg font-bold mb-4">이벤트 보상 지급 확인</h3>

            <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-5">
                <div class="flex justify-between">
                    <span class="text-gray-500">대상</span>
                    <span class="font-semibold">${user.name} (ID: ${user.userId})</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">이벤트 코드</span>
                    <span class="font-semibold text-amber-600">${eventCode}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">검토자</span>
                    <span class="font-semibold">${reviewedBy || '-'}</span>
                </div>
                <div class="flex justify-between items-start gap-3">
                    <span class="text-gray-500">검토 메모</span>
                    <span class="font-semibold text-right">${reviewNote || '-'}</span>
                </div>
                <div class="flex justify-between items-start gap-3">
                    <span class="text-gray-500">보상 안내</span>
                    <span class="font-semibold text-right">
                        ${noticeForm.createNotice ? '생성' : '생성 안 함'}
                        ${noticeForm.createNotice ? html`<span class="block text-xs font-normal text-gray-500 mt-1">${noticeForm.noticeTitle || '보상이 지급되었어요'}</span>` : null}
                    </span>
                </div>
            </div>

            <div class="flex gap-3 justify-end">
                <button onClick=${() => setStep('form')} disabled=${loading}
                        class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    이전
                </button>
                <button onClick=${handleSubmit} disabled=${loading}
                        class="px-5 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5">
                    ${loading ? html`
                        <${React.Fragment}>
                            <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
