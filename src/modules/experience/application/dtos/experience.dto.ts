import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JobCategory } from '../../domain/enums/job-category.enum';
import { ExperienceStatus } from '../../domain/enums/experience-status.enum';
import { Experience } from '../../domain/experience.entity';

export class CreateExperienceReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    name: string;

    @IsEnum(JobCategory)
    @ApiProperty({ enum: JobCategory })
    hopeJob: JobCategory;
}

export class ExperienceResDTO {
    id: number;
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.MARKETING })
    hopeJob: JobCategory;
    createdAt: string;

    static from(experience: Experience): ExperienceResDTO {
        const dto = new ExperienceResDTO();
        dto.id = experience.id;
        dto.name = experience.name;
        dto.hopeJob = experience.hopeJob;
        dto.createdAt = experience.createdAt.toISOString();
        return dto;
    }
}

export class ExperienceStateResDTO {
    id: number;
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.MARKETING })
    hopeJob: JobCategory;
    @ApiProperty({ enum: ExperienceStatus, example: ExperienceStatus.ON_CHAT })
    status: ExperienceStatus;
    createdAt: string;

    static from(experience: Experience): ExperienceStateResDTO {
        const dto = new ExperienceStateResDTO();
        dto.id = experience.id;
        dto.name = experience.name;
        dto.hopeJob = experience.hopeJob;
        dto.status = experience.status;
        dto.createdAt = experience.createdAt.toISOString();
        return dto;
    }
}

export class UpdateExperienceReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    @ApiProperty({ required: false, example: '마케팅 인턴 경험' })
    name?: string;

    @IsOptional()
    @IsEnum(JobCategory)
    @ApiProperty({ enum: JobCategory, required: false })
    hopeJob?: JobCategory;
}
