import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExperienceChat } from '../../domain/experience-chat.entity';

@Injectable()
export class ExperienceChatRepository {
    constructor(
        @InjectRepository(ExperienceChat)
        private readonly experienceChatRepository: Repository<ExperienceChat>
    ) {}

    save(experienceChat: ExperienceChat): Promise<ExperienceChat> {
        return this.experienceChatRepository.save(experienceChat);
    }
}
