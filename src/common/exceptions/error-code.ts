import { HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-code.enum";

interface ErrorDetail {
  message: string;
  statusCode: HttpStatus;
}

export const ErrorMap: Record<ErrorCode, ErrorDetail> = {
  [ErrorCode.BAD_REQUEST]: {
    message: '잘못된 요청입니다.',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    message: '잠시 후 다시 시도해주세요.',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },
};