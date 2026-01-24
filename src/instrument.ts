/**
 * Sentry Instrumentation
 * =======================
 * 이 파일은 앱 시작 전 가장 먼저 로드되어야 합니다.
 * main.ts에서 다른 import보다 먼저 import해야 합니다.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */
import * as Sentry from '@sentry/nestjs';

const appProfile = process.env.APP_PROFILE || 'local';
const isLocal = appProfile === 'local';

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Local 환경에서는 Sentry 비활성화
    enabled: !isLocal,

    // 환경 구분 (Finders BE의 environment 설정과 동일)
    environment: appProfile,

    // 릴리스 버전 추적
    release: `folioo-server@${process.env.npm_package_version || 'unknown'}`,

    // Tracing 샘플링 (Finders BE 기준: dev 100%, prod 30%)
    tracesSampleRate: appProfile === 'prod' ? 0.3 : 1.0,

    // PII(개인식별정보) 전송 여부 (Finders BE: false)
    sendDefaultPii: false,

    // 디버그 모드 (개발 환경에서만)
    debug: appProfile === 'dev',
});
