import { ExperienceService } from 'src/modules/experience/application/services/experience.service';
import { AiSseRelayConnection } from 'src/common/ports/ai-sse-relay.port';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { Readable } from 'stream';
import { InterviewService } from '../services/interview.service';
import { SendInterviewChatReqDTO } from '../dtos/interview.dto';
import { InterviewFacade } from './interview.facade';

class InterviewServiceStub {
    readonly createSessionStream = jest.fn<Promise<AiSseRelayConnection>, [number, string]>();

    readonly sendChatStream = jest.fn<
        Promise<AiSseRelayConnection>,
        [string, SendInterviewChatReqDTO]
    >();
}

class ExperienceServiceStub {
    readonly findByIdOrThrow = jest.fn<
        Promise<{ id: number; name: string; sessionId?: string | null }>,
        [number, number]
    >();
    readonly saveInterviewSessionId = jest.fn<Promise<void>, [number, number, string]>();
}

describe('InterviewFacade', () => {
    let interviewFacade: InterviewFacade;
    let interviewServiceStub: InterviewServiceStub;
    let experienceServiceStub: ExperienceServiceStub;

    beforeEach(() => {
        interviewServiceStub = new InterviewServiceStub();
        experienceServiceStub = new ExperienceServiceStub();

        interviewFacade = new InterviewFacade(
            interviewServiceStub as unknown as InterviewService,
            experienceServiceStub as unknown as ExperienceService
        );
    });

    it('stores x-session-id on the target experience after stream is opened', async () => {
        const experience = {
            id: 5,
            name: '서비스 기획 인턴십 경험',
            sessionId: null,
        };
        const relayConnection: AiSseRelayConnection = {
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
        const relayConnection: AiSseRelayConnection = {
            stream: Readable.from([]),
            close: jest.fn(),
        };
        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.createSessionStream.mockResolvedValue(relayConnection);

        await expect(interviewFacade.createSessionStream(42, 6)).rejects.toBeInstanceOf(
            BusinessException
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
        const relayConnection: AiSseRelayConnection = {
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
            fileIds: ['file_1'],
            insightIds: [1],
        };
        const experience = {
            id: 9,
            name: '백엔드 개발 경험',
            sessionId: 'session_resolved',
        };
        const relayConnection: AiSseRelayConnection = {
            stream: Readable.from([]),
            close: jest.fn(),
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);
        interviewServiceStub.sendChatStream.mockResolvedValue(relayConnection);

        const result = await interviewFacade.sendChatStream(42, 9, dto);

        expect(experienceServiceStub.findByIdOrThrow).toHaveBeenCalledWith(9, 42);
        expect(interviewServiceStub.sendChatStream).toHaveBeenCalledWith('session_resolved', dto);
        expect(result).toBe(relayConnection);
    });

    it('throws bad request when experience sessionId is missing for chat stream', async () => {
        const dto: SendInterviewChatReqDTO = {
            message: '추가 질문입니다',
        };
        const experience = {
            id: 10,
            name: '프론트 경험',
            sessionId: null,
        };

        experienceServiceStub.findByIdOrThrow.mockResolvedValue(experience);

        await expect(interviewFacade.sendChatStream(42, 10, dto)).rejects.toBeInstanceOf(
            BusinessException
        );
        expect(interviewServiceStub.sendChatStream).not.toHaveBeenCalled();
    });
});
