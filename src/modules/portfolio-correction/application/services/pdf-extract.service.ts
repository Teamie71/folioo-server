import { Inject, Injectable } from '@nestjs/common';
import { AiPdfExtractPort } from 'src/common/ports/ai-pdf-extract.port';

@Injectable()
export class PdfExtractService {
    constructor(
        @Inject(AiPdfExtractPort)
        private readonly aiPdfExtractPort: AiPdfExtractPort
    ) {}

    async extractText(fileBuffer: Buffer, fileName: string): Promise<string> {
        const result = await this.aiPdfExtractPort.extractText(fileBuffer, fileName);
        return result.extractedText;
    }
}
