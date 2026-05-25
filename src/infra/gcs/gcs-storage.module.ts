import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoragePort } from 'src/common/ports/storage.port';
import { GcsStorageAdapter } from './gcs-storage.adapter';

@Module({
    imports: [ConfigModule],
    providers: [
        GcsStorageAdapter,
        {
            provide: StoragePort,
            useExisting: GcsStorageAdapter,
        },
    ],
    exports: [StoragePort],
})
export class GcsStorageModule {}
