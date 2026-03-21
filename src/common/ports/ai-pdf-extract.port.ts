/**
 * AI 서버가 PDF 추출 작업을 접수했을 때의 응답.
 * 구조화된 결과는 internal `pdf-extraction-result` 콜백으로 수신한다.
 */
export type AiPdfExtractAccepted = {
    message: string;
};

export abstract class AiPdfExtractPort {
    abstract extractText(
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<AiPdfExtractAccepted>;
}
