import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudTasksPort } from 'src/common/ports/cloud-tasks.port';
import { GoogleCloudTasksAdapter } from './google-cloud-tasks.adapter';

@Module({
    imports: [ConfigModule],
    providers: [
        GoogleCloudTasksAdapter,
        {
            provide: CloudTasksPort,
            useExisting: GoogleCloudTasksAdapter,
        },
    ],
    exports: [CloudTasksPort],
})
export class CloudTasksModule {}
