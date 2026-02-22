import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingSupplier } from '../embedding.interface';

@Injectable()
export class OpenRouterStrategy implements EmbeddingSupplier {
    private client: OpenAI;
    private modelName: string;

    constructor(private configService: ConfigService) {
        this.modelName =
            this.configService.get<string>('EMBEDDING_MODEL_NAME') || 'text-embedding-3-small';

        this.client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
        });
    }

    async getEmbedding(text: string): Promise<number[]> {
        const response = await this.client.embeddings.create({
            model: this.modelName,
            input: text,
        });

        return response.data[0].embedding;
    }
}
