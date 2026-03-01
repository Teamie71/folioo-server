import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { ActionRequest } from 'adminjs';
import { join } from 'path';
import { EventRewardFacade } from '../event/application/facades/event-reward.facade';
import { Event } from '../event/domain/entities/event.entity';
import { EventModule } from '../event/event.module';
import { GrantFeedbackRewardAdminActionService } from './application/services/grant-feedback-reward-admin-action.service';

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const nativeDynamicImport = Function('specifier', 'return import(specifier)') as (
    specifier: string
) => Promise<unknown>;

type AdminNestModuleExports = {
    AdminModule: {
        createAdminAsync: (options: {
            imports: unknown[];
            inject: unknown[];
            useFactory: (...args: unknown[]) => Promise<unknown>;
        }) => DynamicModule;
    };
};

type AdminJsModuleExports = {
    default: {
        registerAdapter: (adapter: { Database: unknown; Resource: unknown }) => void;
    };
    ComponentLoader: new () => {
        add: (name: string, filePath: string) => string;
    };
};

type AdminJsTypeOrmModuleExports = {
    Database: unknown;
    Resource: unknown;
};

@Module({
    imports: [
        EventModule,
        ConfigModule,
        nativeDynamicImport('@adminjs/nestjs').then((adminNestModule) =>
            (adminNestModule as AdminNestModuleExports).AdminModule.createAdminAsync({
                imports: [EventModule, ConfigModule],
                inject: [ConfigService, EventRewardFacade],
                useFactory: async (
                    configService: ConfigService,
                    eventRewardFacade: EventRewardFacade
                ) => {
                    const actionService = new GrantFeedbackRewardAdminActionService(
                        eventRewardFacade
                    );

                    const [adminJsModule, adminJsTypeOrmModule] = await Promise.all([
                        nativeDynamicImport('adminjs'),
                        nativeDynamicImport('@adminjs/typeorm'),
                    ]);
                    const { default: AdminJS, ComponentLoader } =
                        adminJsModule as AdminJsModuleExports;
                    const { Database, Resource } =
                        adminJsTypeOrmModule as AdminJsTypeOrmModuleExports;

                    AdminJS.registerAdapter({ Database, Resource });

                    const componentLoader = new ComponentLoader();
                    const grantRewardActionComponent = componentLoader.add(
                        'GrantFeedbackRewardAction',
                        join(__dirname, 'presentation/components/grant-feedback-reward-action.jsx')
                    );

                    const adminEmail = configService.get<string>('ADMINJS_EMAIL');
                    const adminPassword = configService.get<string>('ADMINJS_PASSWORD');
                    const cookieSecret = configService.get<string>('ADMINJS_COOKIE_SECRET');

                    if (!adminEmail || !adminPassword || !cookieSecret) {
                        throw new Error(
                            'ADMINJS_EMAIL, ADMINJS_PASSWORD, ADMINJS_COOKIE_SECRET must be configured'
                        );
                    }

                    return {
                        adminJsOptions: {
                            rootPath: '/admin',
                            componentLoader,
                            resources: [
                                {
                                    resource: Event,
                                    options: {
                                        navigation: {
                                            name: 'Event',
                                            icon: 'Events',
                                        },
                                        actions: {
                                            new: { isAccessible: false },
                                            delete: { isAccessible: false },
                                            bulkDelete: { isAccessible: false },
                                            grantFeedbackRewardByPhone: {
                                                actionType: 'resource',
                                                icon: 'Gift',
                                                label: '전화번호 보상 지급',
                                                component: grantRewardActionComponent,
                                                guard: '전화번호 기준 보상을 지급합니다. 계속하시겠습니까?',
                                                handler: (request: ActionRequest) =>
                                                    actionService.handle(request),
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        auth: {
                            authenticate: (
                                email: string,
                                password: string
                            ): Promise<{ email: string; role: string } | null> => {
                                if (email === adminEmail && password === adminPassword) {
                                    return Promise.resolve({
                                        email,
                                        role: 'admin',
                                    });
                                }

                                return Promise.resolve(null);
                            },
                            cookieName: 'folioo-adminjs',
                            cookiePassword: cookieSecret,
                        },
                        sessionOptions: {
                            resave: false,
                            saveUninitialized: false,
                            secret: cookieSecret,
                            cookie: {
                                httpOnly: true,
                                sameSite: 'lax',
                                secure: configService.get<string>('NODE_ENV') === 'production',
                            },
                        },
                    };
                },
            })
        ),
    ],
})
export class AdminPanelModule {}
