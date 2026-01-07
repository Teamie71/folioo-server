import { ApiProperty } from '@nestjs/swagger';
import { JobCategory } from '../../domain/enums/job-category.enum';

export class CreateExperienceReqDTO {
    name: string;
    hopeJob: JobCategory;
}

export class ExperienceResDTO {
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.MARKETING })
    hopeJob: JobCategory;
    createdAt: string;
}

export class ExperienceStateResDTO {
    status: string;
    id: number;
}
