import { applyDecorators, Type } from '@nestjs/common';
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

interface SwaggerExampleValue {
    summary: string;
    value: {
        timestamp: string;
        isSuccess: boolean;
        result: null;
        error: {
            errorCode: ErrorCode;
            reason: string;
            details: null;
            path: string;
        };
    };
}

type ErrorsByStatus = Record<number, Record<string, SwaggerExampleValue>>;

// 에러 응답
export const ApiCommonErrorResponse = (...errorCodes: ErrorCode[]) => {
    const errorsByStatus = errorCodes.reduce<ErrorsByStatus>((acc, errorCode) => {
        const errorInfo = ErrorMap[errorCode];
        const status = errorInfo.statusCode;

        if (!acc[status]) {
            acc[status] = {};
        }

        acc[status][errorCode] = {
            summary: errorInfo.message,
            value: {
                timestamp: '2024-01-02T12:34:56.000Z',
                isSuccess: false,
                result: null,
                error: {
                    errorCode: errorCode,
                    reason: errorInfo.message,
                    details: null,
                    path: '/path/to/your/api',
                },
            },
        };
        return acc;
    }, {});

    const decorators = Object.entries(errorsByStatus).map(([status, examples]) => {
        return ApiResponse({
            status: Number(status),
            description: 'Error Response',
            content: {
                'application/json': {
                    schema: {
                        $ref: getSchemaPath(CommonResponse),
                    },
                    examples: examples,
                },
            },
        });
    });

    return applyDecorators(ApiExtraModels(CommonResponse, ErrorPayload), ...decorators);
};
