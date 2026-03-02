export interface AiPdfExtractResult {
    extractedText: string;
}

export abstract class AiPdfExtractPort {
    abstract extractText(fileBuffer: Buffer, fileName: string): Promise<AiPdfExtractResult>;
}
