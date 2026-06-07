import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateVisualizationReqDTO {
    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(1)
    portfolioId: number;

    @ApiProperty({ example: 'modern-clean' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    templateId: string;
}

export class CreateVisualizationResDTO {
    @ApiProperty({ example: 'b3e2f1a0-1234-5678-abcd-ef0123456789' })
    jobId: string;
}
