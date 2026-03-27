/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExperienceService } from 'src/modules/experience/application/services/experience.service';
import { InsightService } from 'src/modules/insight/application/services/insight.service';
import { AiRelayConnection } from 'src/common/ports/ai-relay.port';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { Readable } from 'stream';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { InterviewService } from '../services/interview.service';
import { InterviewSessionStateResDTO, SendInterviewChatReqDTO } from '../dtos/interview.dto';
import { InterviewFacade } from './interview.facade';
import { InterviewChatUploadFile } from '../../presentation/services/interview-chat-stream-request-parser.service';

class InterviewServiceStub {
    readonly createSessionStream = jest.fn<Promise<AiRelayConnection>, [number, string]>();

    readonly sendChatStream = jest.fn<
        Promise<AiRelayConnection>,
        [string, string, string | undefined, InterviewChatUploadFile | undefined]
    >();

    readonly getSessionState = jest.fn<Promise<InterviewSessionStateResDTO>, [string]>();

    readonly extendSessionStream = jest.fn<Promise<AiRelayConnection>, [string]>();
}

class ExperienceServiceStub {
    readonly findByIdOrThrow = jest.fn<
        Promise<{ id: number; name: string; sessionId?: string | null }>,
        [number, number]
    >();
    readonly saveInterviewSessionId = jest.fn<Promise<void>, [number, number, string]>();
}

class InsightServiceStub {
    readonly findByIdAndUserOrThrow = jest.fn<Promise<{ id: number }>, [number, number]>();
}

class PortfolioServiceStub {}

describe('InterviewFacade', () => {
    let interviewFacade: InterviewFacade;
    let interviewServiceStub: InterviewServiceStub;
    let experienceServiceStub: ExperienceServiceStub;
    let insightServiceStub: InsightServiceStub;

    beforeEach(() => {
        interviewServiceStub = new InterviewServiceStub();
        experienceServiceStub = new ExperienceServiceStub();
        insightServiceStub = new InsightServiceStub();

        interviewFacade = new InterviewFacade(
            interviewServiceStub as unknown as InterviewService,
            experienceServiceStub as unknown as ExperienceService,
            insightServiceStub as unknown as InsightService,
            new PortfolioServiceStub() as unknown as PortfolioService
        );
    });

    it('stores x-session-id on the target experience after stream is opened', async () => {
        const experience = {
            id: 5,
            name: '서비스 기획 인턴십 경험',
            sessionId: null,
        };
        const relayConnection: AiRelayConnection = {
            stream: Readable.from([]),
            close: jest.fn(),
            responseHeaders: {
                'x-session-id': 'session_abc',
            },
        };
        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.createSessionStream.mockResolvedValue(relayConnection);
        experienceServiceStub.saveInterviewSessionId.mockResolvedValue();

        const result = await interviewFacade.createSessionStream(42, 5);

        expect(experienceServiceStub.findByIdOrThrow).toHaveBeenCalledWith(5, 42);
        expect(interviewServiceStub.createSessionStream).toHaveBeenCalledWith(
            42,
            '서비스 기획 인턴십 경험'
        );
        expect(experienceServiceStub.saveInterviewSessionId).toHaveBeenCalledWith(
            5,
            42,
            'session_abc'
        );
        expect(result).toBe(relayConnection);
    });

    it('throws conflict when experience already has interview session id', async () => {
        expect.assertions(4);

        const experience = {
            id: 11,
            name: '이미 세션이 있는 경험',
            sessionId: 'session_existing',
        };
        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);

        try {
            await interviewFacade.createSessionStream(42, 11);
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            if (error instanceof BusinessException) {
                const response = error.getResponse() as { errorCode: ErrorCode };
                expect(response.errorCode).toBe(ErrorCode.EXPERIENCE_SESSION_ALREADY_EXISTS);
            }
        }

        expect(interviewServiceStub.createSessionStream).not.toHaveBeenCalled();
        expect(experienceServiceStub.saveInterviewSessionId).not.toHaveBeenCalled();
    });

    it('fails when x-session-id header is absent', async () => {
        const experience = {
            id: 6,
            name: '백엔드 개발 경험',
            sessionId: null,
        };
        const relayConnection: AiRelayConnection = {
            stream: Readable.from([]),
            close: jest.fn(),
        };
        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.createSessionStream.mockResolvedValue(relayConnection);

        await expect(interviewFacade.createSessionStream(42, 6)).rejects.toMatchObject(
            expect.objectContaining({
                response: expect.objectContaining({
                    errorCode: ErrorCode.INTERVIEW_AI_RELAY_FAILED,
                }),
            })
        );

        expect(experienceServiceStub.saveInterviewSessionId).not.toHaveBeenCalled();
        expect(relayConnection.close).toHaveBeenCalled();
    });

    it('closes relay connection when session-id persistence fails', async () => {
        const experience = {
            id: 7,
            name: '프론트엔드 개발 경험',
            sessionId: null,
        };
        const relayConnection: AiRelayConnection = {
            stream: Readable.from([]),
            close: jest.fn(),
            responseHeaders: {
                'x-session-id': 'session_xyz',
            },
        };
        const expectedError = new Error('db save failed');

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.createSessionStream.mockResolvedValue(relayConnection);
        experienceServiceStub.saveInterviewSessionId.mockRejectedValue(expectedError);

        await expect(interviewFacade.createSessionStream(42, 7)).rejects.toThrow('db save failed');
        expect(relayConnection.close).toHaveBeenCalled();
    });

    it('resolves sessionId from experience before sending chat stream', async () => {
        const dto: SendInterviewChatReqDTO = {
            message: '안녕하세요',
            insightId: 1,
        };
        const experience = {
            id: 9,
            name: '백엔드 개발 경험',
            sessionId: 'session_resolved',
        };
        const relayConnection: AiRelayConnection = {
            stream: Readable.from([]),
            close: jest.fn(),
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.sendChatStream.mockResolvedValue(relayConnection);
        insightServiceStub.findByIdAndUserOrThrow.mockResolvedValue({ id: 1 });

        const result = await interviewFacade.sendChatStream(42, 9, dto);

        expect(experienceServiceStub.findByIdOrThrow).toHaveBeenCalledWith(9, 42);
        expect(insightServiceStub.findByIdAndUserOrThrow).toHaveBeenCalledTimes(1);
        expect(insightServiceStub.findByIdAndUserOrThrow).toHaveBeenCalledWith(1, 42);
        expect(interviewServiceStub.sendChatStream).toHaveBeenCalledWith(
            'session_resolved',
            '안녕하세요',
            1,
            undefined
        );
        expect(result).toBe(relayConnection);
    });

    it('throws domain error when experience sessionId is missing for chat stream', async () => {
        const dto: SendInterviewChatReqDTO = {
            message: '추가 질문입니다',
        };
        const experience = {
            id: 10,
            name: '프론트 경험',
            sessionId: null,
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);

        await expect(interviewFacade.sendChatStream(42, 10, dto)).rejects.toMatchObject(
            expect.objectContaining({
                response: expect.objectContaining({
                    errorCode: ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED,
                }),
            })
        );
        expect(interviewServiceStub.sendChatStream).not.toHaveBeenCalled();
    });

    it('throws domain error when experience sessionId is missing for session state request', async () => {
        const experience = {
            id: 13,
            name: '모바일 개발 경험',
            sessionId: null,
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);

        await expect(interviewFacade.getSessionState(55, 13)).rejects.toMatchObject(
            expect.objectContaining({
                response: expect.objectContaining({
                    errorCode: ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED,
                }),
            })
        );
    });

    it('delegates session state retrieval to interview service after resolving session id', async () => {
        const experience = {
            id: 12,
            name: '데이터 분석 경험',
            sessionId: 'session_state_123',
        };
        const sessionState: InterviewSessionStateResDTO = {
            messages: [],
            experienceName: experience.name,
            currentStage: 1,
            allComplete: false,
            turnNumber: 0,
            insightTurnHistory: [],
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.getSessionState.mockResolvedValue(sessionState);

        const result = await interviewFacade.getSessionState(99, 12);

        expect(experienceServiceStub.findByIdOrThrow).toHaveBeenCalledWith(12, 99);
        expect(interviewServiceStub.getSessionState).toHaveBeenCalledWith('session_state_123');
        expect(result).toBe(sessionState);
    });

    it('returns relay connection when extending a completed interview session', async () => {
        const experience = {
            id: 20,
            name: '연장 테스트 경험',
            sessionId: 'session_extend_ok',
        };
        const sessionState: InterviewSessionStateResDTO = {
            messages: [],
            experienceName: experience.name,
            currentStage: 3,
            allComplete: true,
            turnNumber: 0,
            insightTurnHistory: [],
        };
        const relayConnection: AiRelayConnection = {
            stream: Readable.from([]),
            close: jest.fn(),
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.getSessionState.mockResolvedValue(sessionState);
        interviewServiceStub.extendSessionStream.mockResolvedValue(relayConnection);

        const result = await interviewFacade.extendSessionStream(77, 20);

        expect(experienceServiceStub.findByIdOrThrow).toHaveBeenCalledWith(20, 77);
        expect(interviewServiceStub.getSessionState).toHaveBeenCalledWith('session_extend_ok');
        expect(interviewServiceStub.extendSessionStream).toHaveBeenCalledWith('session_extend_ok');
        expect(result).toBe(relayConnection);
    });

    it('throws INTERVIEW_SESSION_NOT_INITIALIZED when sessionId is missing for extend', async () => {
        const experience = {
            id: 21,
            name: '세션 없는 경험',
            sessionId: null,
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);

        await expect(interviewFacade.extendSessionStream(77, 21)).rejects.toMatchObject(
            expect.objectContaining({
                response: expect.objectContaining({
                    errorCode: ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED,
                }),
            })
        );
        expect(interviewServiceStub.getSessionState).not.toHaveBeenCalled();
        expect(interviewServiceStub.extendSessionStream).not.toHaveBeenCalled();
    });

    it('throws INTERVIEW_EXTEND_NOT_ALLOWED when interview is not completed', async () => {
        const experience = {
            id: 22,
            name: '미완료 인터뷰 경험',
            sessionId: 'session_incomplete',
        };
        const sessionState: InterviewSessionStateResDTO = {
            messages: [],
            experienceName: experience.name,
            currentStage: 1,
            allComplete: false,
            turnNumber: 0,
            insightTurnHistory: [],
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.getSessionState.mockResolvedValue(sessionState);

        await expect(interviewFacade.extendSessionStream(77, 22)).rejects.toMatchObject(
            expect.objectContaining({
                response: expect.objectContaining({
                    errorCode: ErrorCode.INTERVIEW_EXTEND_NOT_ALLOWED,
                }),
            })
        );
        expect(interviewServiceStub.extendSessionStream).not.toHaveBeenCalled();
    });
});
