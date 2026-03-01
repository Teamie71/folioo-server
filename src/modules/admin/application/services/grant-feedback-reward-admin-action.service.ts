import type { ActionRequest } from 'adminjs';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { EventRewardFacade } from 'src/modules/event/application/facades/event-reward.facade';

type AdminActionResponse = {
    notice: {
        message: string;
        type: 'success' | 'error' | 'info';
    };
    data?: unknown;
};

export class GrantFeedbackRewardAdminActionService {
    constructor(private readonly eventRewardFacade: EventRewardFacade) {}

    async handle(request: ActionRequest): Promise<AdminActionResponse> {
        if (request.method?.toLowerCase() !== 'post') {
            return {
                notice: {
                    message: '이 액션은 폼 제출(POST)로만 실행됩니다.',
                    type: 'info',
                },
            };
        }

        const payload = request.payload;
        const eventCode = typeof payload?.eventCode === 'string' ? payload.eventCode.trim() : '';
        const phoneNum = typeof payload?.phoneNum === 'string' ? payload.phoneNum.trim() : '';
        const externalSubmissionId =
            typeof payload?.externalSubmissionId === 'string'
                ? payload.externalSubmissionId.trim()
                : undefined;
        const reviewedBy =
            typeof payload?.reviewedBy === 'string' ? payload.reviewedBy.trim() : undefined;
        const reviewNote =
            typeof payload?.reviewNote === 'string' ? payload.reviewNote.trim() : undefined;

        if (!eventCode || !phoneNum) {
            return {
                notice: {
                    message: 'eventCode와 phoneNum은 필수 입력값입니다.',
                    type: 'error',
                },
            };
        }

        try {
            const result = await this.eventRewardFacade.grantFeedbackRewardByPhone(eventCode, {
                phoneNum,
                externalSubmissionId,
                reviewedBy,
                reviewNote,
            });

            return {
                notice: {
                    message: '보상 지급이 완료되었습니다. 결과를 확인해주세요.',
                    type: 'success',
                },
                data: result,
            };
        } catch (error) {
            return {
                notice: {
                    message: this.getErrorMessage(error),
                    type: 'error',
                },
            };
        }
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof BusinessException) {
            const response = error.getResponse();
            if (
                typeof response === 'object' &&
                response !== null &&
                'reason' in response &&
                typeof response.reason === 'string'
            ) {
                return response.reason;
            }

            return error.message;
        }

        if (error instanceof Error) {
            return error.message;
        }

        return '보상 지급 처리 중 알 수 없는 오류가 발생했습니다.';
    }
}
