import { HttpStatus, LoggerService } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AiRelayConnection } from 'src/common/ports/ai-relay.port';

export interface RelaySseStreamOptions {
    connection: AiRelayConnection;
    request: Request;
    response: Response;
    logger: LoggerService;
    errorLogPrefix: string;
    errorEventPayload: string;
}

export class SseRelayUtil {
    static relayStream(options: RelaySseStreamOptions): void {
        const { connection, request, response } = options;

        this.initializeResponse(response);

        const upstreamStream = connection.stream;
        let isFinalized = false;

        const finalize = (): void => {
            if (isFinalized) {
                return;
            }
            isFinalized = true;

            request.off('close', onClientClose);
            request.off('aborted', onClientAborted);
            upstreamStream.off('data', onData);
            upstreamStream.off('error', onError);
            upstreamStream.off('end', onEnd);

            connection.close();

            if (!response.writableEnded) {
                response.end();
            }
        };

        const onData = (chunk: unknown): void => {
            if (response.writableEnded) {
                return;
            }

            if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
                response.write(chunk);
                return;
            }

            if (chunk instanceof Uint8Array) {
                response.write(Buffer.from(chunk));
            }
        };

        const onError = (error: unknown): void => {
            const message = error instanceof Error ? error.message : 'Unknown stream relay error';
            options.logger.error(`${options.errorLogPrefix}: ${message}`);

            if (!response.writableEnded) {
                response.write(`event: error\ndata: ${options.errorEventPayload}\n\n`);
            }

            finalize();
        };

        const onEnd = (): void => {
            finalize();
        };

        const onClientClose = (): void => {
            finalize();
        };

        const onClientAborted = (): void => {
            finalize();
        };

        request.on('close', onClientClose);
        request.on('aborted', onClientAborted);
        upstreamStream.on('data', onData);
        upstreamStream.on('error', onError);
        upstreamStream.on('end', onEnd);
    }

    private static initializeResponse(response: Response): void {
        response.status(HttpStatus.OK);
        response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        response.setHeader('Cache-Control', 'no-cache, no-transform');
        response.setHeader('Connection', 'keep-alive');
        response.setHeader('X-Accel-Buffering', 'no');

        response.flushHeaders();
    }
}
