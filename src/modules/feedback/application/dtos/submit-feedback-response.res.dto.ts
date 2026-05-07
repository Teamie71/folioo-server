import { ApiProperty } from '@nestjs/swagger';

export class SubmitFeedbackResponseResDTO {
    @ApiProperty({ example: true })
    rewardGranted: boolean;
}
