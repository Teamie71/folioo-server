import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { JobCategory } from '../../domain/enums/job-category.enum';
import { Experience } from '../../domain/experience.entity';

export class CreateExperienceReqDto {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    name: string;

    @IsEnum(JobCategory)
    @ApiProperty({ enum: JobCategory })
    hopeJob: JobCategory;
}

export class ExperienceResDto {
    id: number;
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.MARKETING })
    hopeJob: JobCategory;
    createdAt: string;

    static from(experience: Experience): ExperienceResDto {
        const dto = new ExperienceResDto();
        dto.id = experience.id;
        dto.name = experience.name;
        dto.hopeJob = experience.hopeJob;
        dto.createdAt = experience.createdAt.toISOString();
        return dto;
    }
}

export class ExperienceStateResDto {
    status: string;
    id: number;
}
