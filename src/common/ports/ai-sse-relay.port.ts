import { Readable } from 'stream';

export interface AiSseRelayRequest {
    path: string;
    body: Record<string, unknown>;
}

export interface AiSseRelayConnection {
    stream: Readable;
    close: () => void;
    responseHeaders?: Record<string, string>;
}

export abstract class AiSseRelayPort {
    abstract openPostStream(request: AiSseRelayRequest): Promise<AiSseRelayConnection>;
}
