import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

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
    [ErrorCode.ALREADY_VERIFY_USER]: {
        message: '이미 인증 이력이 있는 번호입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.SMS_CODE_MISMATCH]: {
        message: '인증 번호가 일치하지 않습니다. 다시 확인해 주세요.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.SMS_CODE_NOT_FOUND]: {
        message: '인증 시간이 만료되었습니다. 재전송 버튼을 눌러주세요.',
        statusCode: HttpStatus.NOT_FOUND,
    },
};
