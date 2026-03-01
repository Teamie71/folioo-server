import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { ActionRequest } from 'adminjs';
import { join } from 'path';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { EventRewardFacade } from '../event/application/facades/event-reward.facade';
import { Event } from '../event/domain/entities/event.entity';
import { EventModule } from '../event/event.module';

function getErrorMessage(error: unknown): string {
    if (error instanceof BusinessException) {
        const response = error.getResponse();
        if (
            typeof response === 'object' &&
            response !== null &&
            'reason' in response &&
            typeof response.reason === 'string'
        ) {
            return response.reason;
        }

        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return '보상 지급 처리 중 알 수 없는 오류가 발생했습니다.';
}

@Module({
    imports: [
        EventModule,
        ConfigModule,
        import('@adminjs/nestjs').then(({ AdminModule }) =>
            AdminModule.createAdminAsync({
                imports: [EventModule, ConfigModule],
                inject: [ConfigService, EventRewardFacade],
                useFactory: async (
                    configService: ConfigService,
                    eventRewardFacade: EventRewardFacade
                ) => {
                    const [{ default: AdminJS, ComponentLoader }, { Database, Resource }] =
                        await Promise.all([import('adminjs'), import('@adminjs/typeorm')]);

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
                                                handler: async (request: ActionRequest) => {
                                                    if (request.method?.toLowerCase() !== 'post') {
                                                        return {
                                                            notice: {
                                                                message:
                                                                    '이 액션은 폼 제출(POST)로만 실행됩니다.',
                                                                type: 'info',
                                                            },
                                                        };
                                                    }

                                                    const payload = request.payload;
                                                    const eventCode =
                                                        typeof payload?.eventCode === 'string'
                                                            ? payload.eventCode.trim()
                                                            : '';
                                                    const phoneNum =
                                                        typeof payload?.phoneNum === 'string'
                                                            ? payload.phoneNum.trim()
                                                            : '';
                                                    const externalSubmissionId =
                                                        typeof payload?.externalSubmissionId ===
                                                        'string'
                                                            ? payload.externalSubmissionId.trim()
                                                            : undefined;
                                                    const reviewedBy =
                                                        typeof payload?.reviewedBy === 'string'
                                                            ? payload.reviewedBy.trim()
                                                            : undefined;
                                                    const reviewNote =
                                                        typeof payload?.reviewNote === 'string'
                                                            ? payload.reviewNote.trim()
                                                            : undefined;

                                                    if (!eventCode || !phoneNum) {
                                                        return {
                                                            notice: {
                                                                message:
                                                                    'eventCode와 phoneNum은 필수 입력값입니다.',
                                                                type: 'error',
                                                            },
                                                        };
                                                    }

                                                    try {
                                                        const result =
                                                            await eventRewardFacade.grantFeedbackRewardByPhone(
                                                                eventCode,
                                                                {
                                                                    phoneNum,
                                                                    externalSubmissionId,
                                                                    reviewedBy,
                                                                    reviewNote,
                                                                }
                                                            );

                                                        return {
                                                            notice: {
                                                                message:
                                                                    '보상 지급이 완료되었습니다. 결과를 확인해주세요.',
                                                                type: 'success',
                                                            },
                                                            data: result,
                                                        };
                                                    } catch (error) {
                                                        const message = getErrorMessage(error);

                                                        return {
                                                            notice: {
                                                                message,
                                                                type: 'error',
                                                            },
                                                        };
                                                    }
                                                },
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
