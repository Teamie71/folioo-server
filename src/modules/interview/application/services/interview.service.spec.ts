import { Readable } from 'stream';
import {
    AiSseRelayConnection,
    AiSseRelayPort,
    AiSseRelayRequest,
} from 'src/common/ports/ai-sse-relay.port';
import { SendInterviewChatReqDTO } from '../dtos/interview.dto';
import { InterviewService } from './interview.service';

class AiSseRelayPortStub extends AiSseRelayPort {
    readonly openPostStreamMock = jest.fn<Promise<AiSseRelayConnection>, [AiSseRelayRequest]>();

    openPostStream(request: AiSseRelayRequest): Promise<AiSseRelayConnection> {
        return this.openPostStreamMock(request);
    }
}

describe('InterviewService', () => {
    let interviewService: InterviewService;
    let aiSseRelayPortStub: AiSseRelayPortStub;

    beforeEach(() => {
        aiSseRelayPortStub = new AiSseRelayPortStub();
        aiSseRelayPortStub.openPostStreamMock.mockResolvedValue({
            stream: Readable.from([]),
            close: jest.fn(),
        });

        interviewService = new InterviewService(aiSseRelayPortStub);
    });

    it('maps session create request to AI server schema', async () => {
        await interviewService.createSessionStream(42, '서비스 기획 인턴십 경험');

        expect(aiSseRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
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

        expect(aiSseRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
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

        expect(aiSseRelayPortStub.openPostStreamMock).toHaveBeenCalledWith({
            path: '/api/v1/interview/sessions/session%201%2F2/chat/stream',
            body: {
                message: '추가 질문입니다.',
                file_ids: [],
                mentioned_insight_ids: [],
            },
        });
    });
});
