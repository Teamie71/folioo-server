import { Readable } from 'stream';

export interface AiRelayRequest {
    path: string;
    body: Record<string, unknown>;
}

export interface AiRelayGetRequest {
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
}

export interface AiRelayConnection {
    stream: Readable;
    close: () => void;
    responseHeaders?: Record<string, string>;
}

export interface AiRelayJsonResponse<T = unknown> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export abstract class AiRelayPort {
    abstract openPostStream(request: AiRelayRequest): Promise<AiRelayConnection>;
    abstract getJson<T = unknown>(request: AiRelayGetRequest): Promise<AiRelayJsonResponse<T>>;
}
