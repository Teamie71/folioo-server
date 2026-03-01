import { AiPdfExtractPort, AiPdfExtractResult } from 'src/common/ports/ai-pdf-extract.port';
import { PdfExtractService } from './pdf-extract.service';

class AiPdfExtractPortStub extends AiPdfExtractPort {
    readonly extractTextMock = jest.fn<Promise<AiPdfExtractResult>, [Buffer, string]>();

    extractText(fileBuffer: Buffer, fileName: string): Promise<AiPdfExtractResult> {
        return this.extractTextMock(fileBuffer, fileName);
    }
}

describe('PdfExtractService', () => {
    let pdfExtractService: PdfExtractService;
    let aiPdfExtractPortStub: AiPdfExtractPortStub;

    beforeEach(() => {
        aiPdfExtractPortStub = new AiPdfExtractPortStub();
        pdfExtractService = new PdfExtractService(aiPdfExtractPortStub);
    });

    it('delegates to AiPdfExtractPort and returns extracted text', async () => {
        const fileBuffer = Buffer.from('fake-pdf-content');
        const fileName = 'portfolio.pdf';
        const expectedText = '추출된 포트폴리오 텍스트입니다.';

        aiPdfExtractPortStub.extractTextMock.mockResolvedValue({
            extractedText: expectedText,
        });

        const result = await pdfExtractService.extractText(fileBuffer, fileName);

        expect(result).toBe(expectedText);
        expect(aiPdfExtractPortStub.extractTextMock).toHaveBeenCalledWith(fileBuffer, fileName);
    });

    it('propagates errors from the port', async () => {
        const fileBuffer = Buffer.from('bad-pdf');
        const fileName = 'broken.pdf';

        aiPdfExtractPortStub.extractTextMock.mockRejectedValue(new Error('AI server down'));

        await expect(pdfExtractService.extractText(fileBuffer, fileName)).rejects.toThrow(
            'AI server down'
        );
    });
});
