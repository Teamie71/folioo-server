import { Readable } from 'stream';
import {
    AiRelayConnection,
    AiRelayGetRequest,
    AiRelayJsonResponse,
    AiRelayPort,
    AiRelayRequest,
} from 'src/common/ports/ai-relay.port';
import { InterviewSessionStateResDTO } from '../dtos/interview.dto';
import { InterviewService } from './interview.service';

class AiRelayPortStub extends AiRelayPort {
    readonly openPostStreamMock = jest.fn<Promise<AiRelayConnection>, [AiRelayRequest]>();
    readonly getJsonMock = jest.fn<
        Promise<AiRelayJsonResponse<Record<string, unknown>>>,
        [AiRelayGetRequest]
    >();

    openPostStream(request: AiRelayRequest): Promise<AiRelayConnection> {
        return this.openPostStreamMock(request);
    }

    getJson<T = unknown>(request: AiRelayGetRequest): Promise<AiRelayJsonResponse<T>> {
        return this.getJsonMock(request) as Promise<AiRelayJsonResponse<T>>;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    postJson<T = unknown>(_request: AiRelayRequest): Promise<AiRelayJsonResponse<T>> {
        return Promise.resolve({ data: {} as T, status: 202, headers: {} });
    }
}

describe('InterviewService', () => {
    let interviewService: InterviewService;
    let aiRelayPortStub: AiRelayPortStub;

    beforeEach(() => {
        aiRelayPortStub = new AiRelayPortStub();
        aiRelayPortStub.openPostStreamMock.mockResolvedValue({
            stream: Readable.from([]),
            close: jest.fn(),
        });

        interviewService = new InterviewService(aiRelayPortStub);
    });

    it('maps session create request to AI server schema', async () => {
        await interviewService.createSessionStream(42, '서비스 기획 인턴십 경험');

        expect(aiRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/stream',
            body: {
                user_id: '42',
                experience_name: '서비스 기획 인턴십 경험',
            },
        });
    });

    it('maps chat stream request to AI server schema', async () => {
        await interviewService.sendChatStream('session_123', '안녕하세요', 1);

        expect(aiRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session_123/chat/stream',
            body: {
                message: '안녕하세요',
                mentioned_insight: 1,
            },
        });
    });

    it('omits mentioned_insight from body when insightId is not provided', async () => {
        await interviewService.sendChatStream('session 1/2', '추가 질문입니다.');

        expect(aiRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session%201%2F2/chat/stream',
            body: {
                message: '추가 질문입니다.',
            },
        });
    });

    it('fetches interview session state via AI relay and maps response', async () => {
        const payload = {
            messages: [
                { type: 'ai', content: '안녕하세요' },
                { type: 'human', content: '반갑습니다' },
            ],
            experience_name: '서비스 기획 인턴십 경험',
            current_stage: 2,
            all_complete: false,
            turn_number: 2,
            insight_turn_history: [],
        };
        aiRelayPortStub.getJsonMock.mockResolvedValue({
            data: payload,
            status: 200,
            headers: {},
        });

        const result = await interviewService.getSessionState('session abc/123');

        expect(aiRelayPortStub.getJsonMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session%20abc%2F123/state',
        });
        expect(result).toEqual<InterviewSessionStateResDTO>({
            messages: [
                { type: 'ai', content: '안녕하세요' },
                { type: 'human', content: '반갑습니다' },
            ],
            experienceName: '서비스 기획 인턴십 경험',
            currentStage: 2,
            allComplete: false,
            turnNumber: 2,
            insightTurnHistory: [],
        });
    });

    it('maps extend stream request to AI server schema', async () => {
        await interviewService.extendSessionStream('session_abc');

        expect(aiRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session_abc/extend/stream',
            body: {},
        });
    });

    it('encodes special characters in sessionId for extend stream path', async () => {
        await interviewService.extendSessionStream('session 1/2');

        expect(aiRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session%201%2F2/extend/stream',
            body: {},
        });
    });
});
