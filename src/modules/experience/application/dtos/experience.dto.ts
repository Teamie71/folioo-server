import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { JobCategory } from '../../domain/enums/job-category.enum';
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
    status: string;
    id: number;
}
