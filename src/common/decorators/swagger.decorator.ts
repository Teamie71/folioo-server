import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { CommonResponse, ErrorPayload } from '../dtos/common-response.dto';
import { ErrorMap } from '../exceptions/error-code';
import { ErrorCode } from '../exceptions/error-code.enum';

const baseResponseSchema = {
    timestamp: { type: 'string', example: '2024-01-02T12:34:56.000Z' },
    isSuccess: { type: 'boolean', example: true },
    error: { type: 'object', nullable: true, example: null },
};

// 단일 객체 응답
export const ApiCommonResponse = <T extends Type<any>>(model: T) => {
    return applyDecorators(
        ApiExtraModels(CommonResponse, model),
        ApiOkResponse({
            description: '성공 응답',
            schema: {
                properties: {
                    ...baseResponseSchema,
                    result: {
                        $ref: getSchemaPath(model),
                    },
                },
            },
        })
    );
};

// 배열 응답
export const ApiCommonResponseArray = <T extends Type<any>>(model: T) => {
    return applyDecorators(
        ApiExtraModels(CommonResponse, model),
        ApiOkResponse({
            description: '성공 응답',
            schema: {
                properties: {
                    ...baseResponseSchema,
                    result: {
                        type: 'array',
                        items: { $ref: getSchemaPath(model) },
                    },
                },
            },
        })
    );
};

// 에러 응답
export const ApiCommonErrorResponse = (errorCode: ErrorCode) => {
    const status: HttpStatus = ErrorMap[errorCode].statusCode ?? HttpStatus.UNAUTHORIZED;
    const reason: string = ErrorMap[errorCode].message ?? '서버 에러가 발생하였습니다.';

    return applyDecorators(
        ApiExtraModels(CommonResponse, ErrorPayload),

        ApiResponse({
            status,
            description: reason,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(CommonResponse) },
                    {
                        properties: {
                            timestamp: { type: 'string', example: '2024-01-02T12:34:56.000Z' },
                            isSuccess: { example: false },
                            result: { example: null },
                            error: {
                                allOf: [
                                    { $ref: getSchemaPath(ErrorPayload) },
                                    {
                                        properties: {
                                            errorCode: { example: errorCode },
                                            reason: { example: reason },
                                            details: { example: null },
                                            path: { example: 'api/request/endpoint' },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        })
    );
};
