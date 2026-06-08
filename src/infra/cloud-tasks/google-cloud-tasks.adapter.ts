import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudTasksClient } from '@google-cloud/tasks';
import { CloudTasksPort, VisualizationEnqueuePayload } from 'src/common/ports/cloud-tasks.port';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const GRPC_ALREADY_EXISTS = 6;
const DISPATCH_DEADLINE_SECONDS = 1800;
const VIZ_SCHEMA_VERSION = 1;
const VIZ_GENERATE_PATH = '/tasks/visualizations/generate';

function isGrpcAlreadyExists(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === GRPC_ALREADY_EXISTS
    );
}

@Injectable()
export class GoogleCloudTasksAdapter extends CloudTasksPort {
    private readonly logger = new Logger(GoogleCloudTasksAdapter.name);
    private readonly client: CloudTasksClient | null = null;
    private readonly projectId: string | null = null;
    private readonly location: string | null = null;
    private readonly vizQueueName: string | null = null;
    private readonly workerBaseUrl: string | null = null;
    private readonly workerOidcServiceAccount: string | null = null;
    private readonly workerOidcAudience: string | null = null;
    private readonly callbackBaseUrl: string | null = null;

    constructor(private readonly configService: ConfigService) {
        super();

        this.projectId = this.configService.get<string>('CLOUD_TASKS_PROJECT_ID') ?? null;
        this.location = this.configService.get<string>('CLOUD_TASKS_LOCATION') ?? null;
        this.vizQueueName = this.configService.get<string>('CLOUD_TASKS_VIZ_QUEUE') ?? null;
        this.workerBaseUrl = this.configService.get<string>('CLOUD_TASKS_WORKER_BASE_URL') ?? null;
        this.workerOidcServiceAccount =
            this.configService.get<string>('CLOUD_TASKS_WORKER_OIDC_SERVICE_ACCOUNT') ?? null;
        this.workerOidcAudience =
            this.configService.get<string>('CLOUD_TASKS_WORKER_OIDC_AUDIENCE') ?? null;
        this.callbackBaseUrl =
            this.configService.get<string>('VISUALIZATION_CALLBACK_BASE_URL') ?? null;

        const missingVars = [
            this.projectId,
            this.location,
            this.vizQueueName,
            this.workerBaseUrl,
            this.workerOidcServiceAccount,
            this.workerOidcAudience,
            this.callbackBaseUrl,
        ].some((v) => !v);

        if (missingVars) {
            this.logger.warn(
                'Cloud Tasks 환경변수가 일부 설정되지 않았습니다. enqueueVisualizationTask를 호출할 수 없습니다.'
            );
            return;
        }

        const credentialsJson = this.configService.get<string>('CLOUD_TASKS_SERVICE_ACCOUNT_KEY');
        if (credentialsJson) {
            try {
                this.client = new CloudTasksClient({
                    credentials: JSON.parse(credentialsJson) as Record<string, unknown>,
                });
            } catch {
                this.logger.warn(
                    'CLOUD_TASKS_SERVICE_ACCOUNT_KEY가 유효하지 않아 ADC(Application Default Credentials)로 폴백합니다.'
                );
                this.client = new CloudTasksClient();
            }
        } else {
            // GCE 환경에서는 ADC를 사용
            this.client = new CloudTasksClient();
        }
    }

    async enqueueVisualizationTask(payload: VisualizationEnqueuePayload): Promise<string> {
        if (
            !this.client ||
            !this.projectId ||
            !this.location ||
            !this.vizQueueName ||
            !this.workerBaseUrl ||
            !this.workerOidcServiceAccount ||
            !this.workerOidcAudience
        ) {
            throw new BusinessException(ErrorCode.CLOUD_TASKS_ENQUEUE_FAILED);
        }

        const queuePath = this.client.queuePath(this.projectId, this.location, this.vizQueueName);
        const workerUrl = `${this.workerBaseUrl}${VIZ_GENERATE_PATH}`;

        const body = {
            messageType: 'viz.generate',
            jobId: payload.jobId,
            portfolioId: payload.portfolioId,
            userId: payload.userId,
            templateId: payload.templateId,
            callbackBaseUrl: this.callbackBaseUrl,
            idempotencyKey: payload.idempotencyKey,
            schemaVersion: VIZ_SCHEMA_VERSION,
        };

        const taskName = this.client.taskPath(
            this.projectId,
            this.location,
            this.vizQueueName,
            payload.idempotencyKey
        );

        try {
            const [task] = await this.client.createTask({
                parent: queuePath,
                task: {
                    name: taskName,
                    httpRequest: {
                        httpMethod: 'POST',
                        url: workerUrl,
                        headers: { 'Content-Type': 'application/json' },
                        body: Buffer.from(JSON.stringify(body)).toString('base64'),
                        oidcToken: {
                            serviceAccountEmail: this.workerOidcServiceAccount,
                            audience: this.workerOidcAudience,
                        },
                    },
                    dispatchDeadline: { seconds: DISPATCH_DEADLINE_SECONDS },
                },
            });

            return task.name ?? '';
        } catch (error: unknown) {
            // ALREADY_EXISTS (gRPC code 6): 동일 idempotencyKey로 이미 등록된 태스크 → 멱등성 보장
            if (isGrpcAlreadyExists(error)) {
                return taskName;
            }
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to enqueue visualization task for jobId: ${payload.jobId} — ${message}`
            );
            throw new BusinessException(ErrorCode.CLOUD_TASKS_ENQUEUE_FAILED);
        }
    }
}
