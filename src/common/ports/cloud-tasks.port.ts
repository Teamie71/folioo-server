export interface VisualizationEnqueuePayload {
    jobId: string;
    portfolioId: number;
    userId: number;
    templateId: string;
    idempotencyKey: string;
}

export abstract class CloudTasksPort {
    abstract enqueueVisualizationTask(payload: VisualizationEnqueuePayload): Promise<string>;
}
