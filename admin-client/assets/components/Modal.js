/* eslint-disable */
import { html, useState, useEffect, useCallback } from '../lib/setup.js';
import { TICKET_TYPE_LABELS, api } from '../lib/api.js';

function formatRewardSummary(rewards) {
    if (!rewards || rewards.length === 0) return '';
    return rewards
        .filter((r) => r.quantity > 0)
        .map((r) => `${TICKET_TYPE_LABELS[r.type] || r.type} ${r.quantity}회권`)
        .join(' + ');
}

function resolveCtaFromRewards(rewards) {
    const hasExp = rewards.some((r) => r.type === 'EXPERIENCE' && r.quantity > 0);
    const hasCorr = rewards.some((r) => r.type === 'PORTFOLIO_CORRECTION' && r.quantity > 0);

    if (!hasExp && hasCorr) return { ctaText: '첨삭 의뢰하기', ctaLink: '/correction' };
    return { ctaText: '경험 정리하기', ctaLink: '/experience' };
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

export function GrantEventRewardModal({ open, user, onClose, onSuccess }) {
    const [eventOptions, setEventOptions] = useState([]);
    const [eventCode, setEventCode] = useState('');
    const [reviewedBy, setReviewedBy] = useState('김수빈');
    const [externalSubmissionId, setExternalSubmissionId] = useState('');
    const [reviewNote, setReviewNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('form');

    // CS custom rewards
    const [csExperienceQty, setCsExperienceQty] = useState(0);
    const [csCorrectionQty, setCsCorrectionQty] = useState(0);

    const selectedEvent = eventOptions.find((e) => e.code === eventCode) || null;
    const isCs = selectedEvent?.allowMultipleRewards === true;

    // Load event options with userId for isGranted check
    const loadEventOptions = useCallback(async () => {
        if (!user) return;
        try {
            const result = await api(
                `/admin/api/events/manual-reward-options?userId=${user.userId}`
            );
            setEventOptions(result.events || []);
        } catch (_) {
            setEventOptions([]);
        }
    }, [user]);

    useEffect(() => {
        if (open) {
            setEventCode('');
            setReviewedBy('김수빈');
            setExternalSubmissionId('');
            setReviewNote('');
            setStep('form');
            setLoading(false);
            setCsExperienceQty(0);
            setCsCorrectionQty(0);
            loadEventOptions();
        }
    }, [open, loadEventOptions]);

    if (!user) return null;

    // Determine actual rewards for this grant
    const effectiveRewards = isCs
        ? [
              { type: 'EXPERIENCE', quantity: csExperienceQty },
              { type: 'PORTFOLIO_CORRECTION', quantity: csCorrectionQty },
          ].filter((r) => r.quantity > 0)
        : selectedEvent?.rewardConfig || [];

    const rewardSummary = formatRewardSummary(effectiveRewards);
    const cta = effectiveRewards.length > 0 ? resolveCtaFromRewards(effectiveRewards) : null;

    const canSubmit = eventCode.trim() && (!isCs || effectiveRewards.length > 0);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body = {
                userId: user.userId,
                reviewedBy: reviewedBy || undefined,
                externalSubmissionId: externalSubmissionId || undefined,
                reviewNote: reviewNote || undefined,
            };

            if (isCs && effectiveRewards.length > 0) {
                body.customRewards = effectiveRewards;
            }

            const result = await api(`/admin/api/events/${encodeURIComponent(eventCode)}/grants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
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

            <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] gap-4 items-start">
                <!-- Left: Event details -->
                <div class="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">이벤트 코드</label>
                        <select value=${eventCode}
                                onChange=${(e) => setEventCode(e.target.value)}
                                class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm
                                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
                            <option value="">이벤트 선택</option>
                            ${eventOptions.map((event) => {
                                const disabled = event.isGranted && !event.allowMultipleRewards;
                                const label = disabled
                                    ? `${event.title} (${event.code}) — 지급 완료`
                                    : `${event.title} (${event.code})`;
                                return html`<option key=${event.code} value=${event.code} disabled=${disabled}>${label}</option>`;
                            })}
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

                    ${isCs ? html`
                        <div class="border-t border-gray-200 pt-4">
                            <label class="block text-sm font-semibold text-gray-600 mb-3">지급 이용권</label>
                            <div class="space-y-2">
                                <div class="flex items-center gap-3">
                                    <span class="text-sm text-gray-600 w-28">경험 정리</span>
                                    <div class="flex items-center gap-2">
                                        <button type="button"
                                                onClick=${() => setCsExperienceQty(Math.max(0, csExperienceQty - 1))}
                                                class="w-7 h-7 flex items-center justify-center border border-gray-300
                                                       rounded-md text-gray-500 hover:bg-gray-100 text-sm font-bold">−</button>
                                        <span class="w-6 text-center text-sm font-semibold tabular-nums">${csExperienceQty}</span>
                                        <button type="button"
                                                onClick=${() => setCsExperienceQty(Math.min(10, csExperienceQty + 1))}
                                                class="w-7 h-7 flex items-center justify-center border border-gray-300
                                                       rounded-md text-gray-500 hover:bg-gray-100 text-sm font-bold">+</button>
                                        <span class="text-xs text-gray-400">회권</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-sm text-gray-600 w-28">포트폴리오 첨삭</span>
                                    <div class="flex items-center gap-2">
                                        <button type="button"
                                                onClick=${() => setCsCorrectionQty(Math.max(0, csCorrectionQty - 1))}
                                                class="w-7 h-7 flex items-center justify-center border border-gray-300
                                                       rounded-md text-gray-500 hover:bg-gray-100 text-sm font-bold">−</button>
                                        <span class="w-6 text-center text-sm font-semibold tabular-nums">${csCorrectionQty}</span>
                                        <button type="button"
                                                onClick=${() => setCsCorrectionQty(Math.min(10, csCorrectionQty + 1))}
                                                class="w-7 h-7 flex items-center justify-center border border-gray-300
                                                       rounded-md text-gray-500 hover:bg-gray-100 text-sm font-bold">+</button>
                                        <span class="text-xs text-gray-400">회권</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : null}
                </div>

                <!-- Right: Notice preview (read-only, always generated) -->
                <div class="rounded-2xl border border-amber-100 bg-white p-4 space-y-4">
                    <div>
                        <span class="block text-sm font-semibold text-gray-600">보상 안내 모달</span>
                        <span class="block text-xs text-gray-400 mt-1">
                            사용자가 다음 접속 시 보상 안내를 보게 됩니다.
                        </span>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-600 mb-1.5">표시 이벤트명</label>
                        <div class="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
                            ${selectedEvent?.title || '-'}
                        </div>
                    </div>

                    <div class="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-gray-600">
                        <div class="font-semibold text-amber-600 mb-1">미리보기</div>
                        <div class="font-medium text-gray-800">보상이 지급되었어요</div>
                        <div class="mt-1 text-[11px] text-gray-500">${selectedEvent?.title || '(이벤트 선택 시 표시)'}</div>
                        <div class="mt-1 leading-relaxed">
                            ${rewardSummary
                                ? `${rewardSummary}이 지급되었어요.`
                                : '(보상 내용이 표시됩니다)'}
                        </div>
                        ${cta ? html`
                            <div class="mt-2 text-[11px] text-amber-600">
                                CTA: ${cta.ctaText} → ${cta.ctaLink}
                            </div>
                        ` : null}
                    </div>

                    <p class="text-[11px] text-gray-400 leading-relaxed">
                        서버가 이벤트명과 이용권 규칙으로 자동 생성합니다.
                    </p>
                </div>
            </div>

            <div class="flex gap-3 justify-end mt-6">
                <button onClick=${onClose}
                        class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                    취소
                </button>
                <button onClick=${() => setStep('confirm')} disabled=${!canSubmit}
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
                    <span class="text-gray-500">이벤트</span>
                    <span class="font-semibold text-amber-600">${selectedEvent?.title || eventCode} (${eventCode})</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">보상</span>
                    <span class="font-semibold">${rewardSummary || '-'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">검토자</span>
                    <span class="font-semibold">${reviewedBy || '-'}</span>
                </div>
                ${reviewNote ? html`
                    <div class="flex justify-between items-start gap-3">
                        <span class="text-gray-500">검토 메모</span>
                        <span class="font-semibold text-right">${reviewNote}</span>
                    </div>
                ` : null}
                <div class="flex justify-between items-start gap-3">
                    <span class="text-gray-500">보상 안내</span>
                    <span class="font-semibold text-right">자동 생성</span>
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
        <${Modal} open=${open} onClose=${onClose} panelClassName="max-w-5xl">
            ${step === 'form' ? formView : confirmView}
        <//>
    `;
}
