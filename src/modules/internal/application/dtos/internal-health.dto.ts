import { ApiProperty } from '@nestjs/swagger';

export class InternalHealthResDTO {
    @ApiProperty({ example: 'folioo-server' })
    service: string;

    @ApiProperty({ example: 'ok' })
    status: string;

    static ok(): InternalHealthResDTO {
        const dto = new InternalHealthResDTO();
        dto.service = 'folioo-server';
        dto.status = 'ok';
        return dto;
    }
}
