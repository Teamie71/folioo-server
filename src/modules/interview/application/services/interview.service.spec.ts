import { Readable } from 'stream';
import {
    AiRelayConnection,
    AiRelayGetRequest,
    AiRelayJsonResponse,
    AiRelayPort,
    AiRelayRequest,
} from 'src/common/ports/ai-relay.port';
import { InterviewSessionStateResDTO, SendInterviewChatReqDTO } from '../dtos/interview.dto';
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
        const dto: SendInterviewChatReqDTO = {
            message: '안녕하세요',
            fileIds: ['file_1'],
            insightIds: [1],
        };

        await interviewService.sendChatStream('session_123', dto);

        expect(aiRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session_123/chat/stream',
            body: {
                message: '안녕하세요',
                file_ids: ['file_1'],
                mentioned_insight_ids: [1],
            },
        });
    });

    it('uses empty arrays when optional chat arrays are omitted', async () => {
        const dto: SendInterviewChatReqDTO = {
            message: '추가 질문입니다.',
        };

        await interviewService.sendChatStream('session 1/2', dto);

        expect(aiRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session%201%2F2/chat/stream',
            body: {
                message: '추가 질문입니다.',
                file_ids: [],
                mentioned_insight_ids: [],
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
        });
    });
});
