import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';
import { MAX_ACTIVITY_TAG_PER_USER } from 'src/modules/insight/domain/entities/activity.entity';

interface ErrorDetail {
    message: string;
    statusCode: HttpStatus;
}

export const ErrorMap: Record<ErrorCode, ErrorDetail> = {
    [ErrorCode.BAD_REQUEST]: {
        message: '잘못된 요청입니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.UNAUTHORIZED]: {
        message: '유효하지 않은 사용자입니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.INTERNAL_SERVER_ERROR]: {
        message: '잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.NOT_IMPLEMENTED]: {
        message: '아직 구현되지 않은 기능입니다.',
        statusCode: HttpStatus.NOT_IMPLEMENTED,
    },
    [ErrorCode.AI_RELAY_REQUEST_FAILED]: {
        message: 'AI 서버 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.INVALID_SOCIAL_PROFILE]: {
        message: '소셜 로그인 프로필 정보가 유효하지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.REFRESH_TOKEN_EXPIRED]: {
        message: '리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.REFRESH_TOKEN_MISSING]: {
        message: '리프레시 토큰이 없습니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.INVALID_REFRESH_TOKEN]: {
        message: '유효하지 않은 토큰입니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.DEACTIVATED_USER]: {
        message: '탈퇴한 사용자입니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.PENDING_USER]: {
        message: '약관 동의가 필요합니다.',
        statusCode: HttpStatus.FORBIDDEN,
    },
    [ErrorCode.SOCIAL_UNLINK_FAILED]: {
        message: '소셜 계정 연결 해제에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.ALREADY_VERIFY_USER]: {
        message: '이미 인증 이력이 있는 번호입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.SMS_CODE_MISMATCH]: {
        message: '인증 번호가 일치하지 않습니다. 다시 확인해 주세요.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.NOT_LOG_OWNER]: {
        message: '인사이트 로그에 접근할 권한이 없는 사용자입니다.',
        statusCode: HttpStatus.FORBIDDEN,
    },
    [ErrorCode.NOT_ACTIVITY_TAG_OWNER]: {
        message: '활동 분류 태그에 접근할 권한이 없는 사용자입니다.',
        statusCode: HttpStatus.FORBIDDEN,
    },
    [ErrorCode.SMS_CODE_NOT_FOUND]: {
        message: '인증 시간이 만료되었습니다. 재전송 버튼을 눌러주세요.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.USER_NOT_FOUND]: {
        message: '해당하는 사용자를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.REQUIRED_TERMS_NOT_AGREED]: {
        message: '필수 약관에 모두 동의해야 합니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.ALREADY_AGREED_USER]: {
        message: '이미 약관에 동의한 사용자입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.TERM_NOT_FOUND]: {
        message: '해당하는 약관을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.LOG_NOT_FOUND]: {
        message: '해당하는 인사이트 로그를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.ACTIVITY_NOT_FOUND]: {
        message: '해당하는 활동 분류 태그를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.EXPERIENCE_NOT_FOUND]: {
        message: '해당하는 경험을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.PORTFOLIO_NOT_FOUND]: {
        message: '해당하는 포트폴리오를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.PORTFOLIO_NOT_EMPTY]: {
        message: '내용이 있는 활동블록은 삭제할 수 없습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.PORTFOLIO_EXTRACT_FAILED]: {
        message: 'AI 서버 텍스트 추출에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED]: {
        message: '인터뷰 세션이 아직 초기화되지 않았습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_MULTIPART_INVALID_CONTENT_TYPE]: {
        message: 'multipart/form-data 요청 형식이 올바르지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_MULTIPART_FIELD_NAME_TOO_LONG]: {
        message: '요청 필드 이름 길이가 허용 범위를 초과했습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_MULTIPART_FIELD_VALUE_TOO_LARGE]: {
        message: '요청 필드 값 크기가 허용 범위를 초과했습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_MESSAGE_EMPTY]: {
        message: '메시지는 비어 있을 수 없습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_MESSAGE_REQUIRED]: {
        message: '메시지는 필수 입력값입니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_INSIGHT_ID_INVALID]: {
        message: 'insightId 값이 올바르지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_FILE_FIELD_INVALID]: {
        message: '파일 필드 이름이 올바르지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_FILE_MIME_INVALID]: {
        message: '지원하지 않는 파일 형식입니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_FILE_SIZE_EXCEEDED]: {
        message: '파일 크기가 허용 범위를 초과했습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_FILE_COUNT_EXCEEDED]: {
        message: '첨부 파일 개수가 허용 범위를 초과했습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_FIELD_COUNT_EXCEEDED]: {
        message: '요청 필드 개수가 허용 범위를 초과했습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_PART_COUNT_EXCEEDED]: {
        message: 'multipart 파트 개수가 허용 범위를 초과했습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_MULTIPART_INVALID_PAYLOAD]: {
        message: 'multipart 요청 본문이 올바르지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.INTERVIEW_NOT_COMPLETED]: {
        message:
            '인터뷰가 아직 완료되지 않았습니다. 모든 질문에 답변한 후 포트폴리오를 생성할 수 있습니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.INTERVIEW_EXTEND_NOT_ALLOWED]: {
        message: '인터뷰가 완료된 상태에서만 연장 모드를 시작할 수 있습니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.INTERVIEW_AI_RELAY_FAILED]: {
        message: 'AI 인터뷰 세션 중계에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.CORRECTION_NOT_FOUND]: {
        message: '해당하는 첨삭 결과를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.DUPLICATE_LOG_NAME]: {
        message: '인사이트 로그의 제목은 중복될 수 없습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.LOG_MAX_LIMIT]: {
        message: '인사이트 로그는 최대 100개까지 가질 수 있습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.DUPLICATE_ACTIVITY_NAME]: {
        message: '활동명은 중복될 수 없습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.FULL_ACTIVITY_TAG]: {
        message: `활동 분류 태그는 최대 ${MAX_ACTIVITY_TAG_PER_USER}개까지 가질 수 있습니다.`,
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EXPERIENCE_MAX_LIMIT]: {
        message: '경험 정리는 최대 15개까지 가질 수 있습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EXPERIENCE_SESSION_ALREADY_EXISTS]: {
        message: '해당 경험에는 이미 인터뷰 세션이 존재합니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EXPERIENCE_SESSION_NOT_READY]: {
        message: '인터뷰 세션이 아직 생성되지 않은 경험입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EXPERIENCE_INVALID_STATUS]: {
        message: '현재 경험 상태에서는 포트폴리오를 생성할 수 없습니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.EXPERIENCE_HAS_CORRECTIONS]: {
        message: '연결된 첨삭이 존재하여 경험을 삭제할 수 없습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.CORRECTION_MAX_LIMIT]: {
        message: '포트폴리오 첨삭은 최대 15개까지 가질 수 있습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED]: {
        message: '포트폴리오 첨삭은 최대 5개의 활동블록(포트폴리오)을 가질 수 있습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.COMPANY_INSIGHT_ALREADY_EXISTS]: {
        message: '기업 분석 정보가 이미 존재합니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.COMPANY_INSIGHT_NOT_READY]: {
        message: '기업 분석 정보가 아직 생성되지 않았습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.CORRECTION_INVALID_STATUS_TRANSITION]: {
        message: '유효하지 않은 첨삭 상태 전이입니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.CORRECTION_PDF_EXTRACTION_INVALID_STATUS]: {
        message: 'PDF 추출 상태가 올바르지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.CORRECTION_PDF_EXTRACTION_EMPTY_ACTIVITIES]: {
        message: 'PDF 추출 결과에 activities가 없습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.CORRECTION_AI_RELAY_FAILED]: {
        message: 'AI 첨삭 생성 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.TICKET_NOT_FOUND]: {
        message: '해당하는 티켓을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.TICKET_PRODUCT_NOT_FOUND]: {
        message: '해당하는 티켓 상품을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.INSUFFICIENT_TICKETS]: {
        message: '티켓이 부족합니다.',
        statusCode: HttpStatus.PAYMENT_REQUIRED,
    },
    [ErrorCode.TICKET_GRANT_NOTICE_NOT_FOUND]: {
        message: '해당하는 보상 안내를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.PAYMENT_NOT_FOUND]: {
        message: '해당하는 결제를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.PAYMENT_NOT_OWNER]: {
        message: '결제에 접근할 권한이 없는 사용자입니다.',
        statusCode: HttpStatus.FORBIDDEN,
    },
    [ErrorCode.PAYMENT_ALREADY_PAID]: {
        message: '이미 결제 완료된 건입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED]: {
        message: '취소할 수 없는 결제 상태입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.PAYMENT_WEBHOOK_INVALID]: {
        message: '유효하지 않은 결제 콜백 요청입니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.PAYMENT_EXTERNAL_API_FAILED]: {
        message: '결제 서비스 일시적 오류입니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.EVENT_NOT_FOUND]: {
        message: '해당하는 이벤트를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.EVENT_PARTICIPATION_NOT_FOUND]: {
        message: '해당하는 이벤트 참여 기록을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.EVENT_NOT_ACTIVE]: {
        message: '현재 활성화된 이벤트가 아닙니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.EVENT_REWARD_ALREADY_GRANTED]: {
        message: '이미 보상이 지급된 이벤트 참여입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EVENT_FEEDBACK_ALREADY_PROCESSED]: {
        message: '이미 처리된 외부 피드백 제출건입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED]: {
        message: '수동 보상 지급이 허용되지 않은 이벤트입니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.EVENT_REWARD_NOT_CLAIMABLE]: {
        message: '현재 보상 지급 조건을 충족하지 않았습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
};
