import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import type { StorageOptions } from '@google-cloud/storage';
import { StoragePort } from 'src/common/ports/storage.port';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class GcsStorageAdapter extends StoragePort {
    private readonly logger = new Logger(GcsStorageAdapter.name);
    private readonly storage: Storage | null = null;
    private readonly bucketName: string | null = null;

    constructor(private readonly configService: ConfigService) {
        super();

        const credentialsJson = this.configService.get<string>('GCS_SERVICE_ACCOUNT_KEY');
        const bucketName = this.configService.get<string>('GCS_BUCKET_NAME');

        if (!credentialsJson || !bucketName) {
            this.logger.warn(
                'GCS_SERVICE_ACCOUNT_KEY 또는 GCS_BUCKET_NAME이 설정되지 않았습니다. GCS 기능을 사용할 수 없습니다.'
            );
            return;
        }

        try {
            this.bucketName = bucketName;
            this.storage = new Storage({
                credentials: JSON.parse(credentialsJson) as StorageOptions['credentials'],
            });
        } catch {
            this.logger.warn(
                'GCS_SERVICE_ACCOUNT_KEY가 유효한 JSON 형식이 아닙니다. GCS 기능을 사용할 수 없습니다.'
            );
        }
    }

    async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
        if (!this.storage || !this.bucketName) {
            throw new BusinessException(ErrorCode.GCS_SIGNED_URL_FAILED);
        }

        try {
            const [url] = await this.storage
                .bucket(this.bucketName)
                .file(key)
                .getSignedUrl({
                    action: 'read',
                    expires: Date.now() + expiresInSeconds * 1000,
                    version: 'v4',
                });
            return url;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to generate signed URL for key: ${key} — ${message}`);
            throw new BusinessException(ErrorCode.GCS_SIGNED_URL_FAILED);
        }
    }
}
