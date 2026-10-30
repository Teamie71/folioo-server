jest.mock('typeorm-transactional', () => ({
    Transactional: () => {
        return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) =>
            descriptor;
    },
}));

import { ExternalPortfolioFacade } from './external-portfolio.facade';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionMaterialService } from '../services/correction-material.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { PdfExtractService } from '../services/pdf-extract.service';
import { CorrectionMaterial } from '../../domain/correction-material.entity';
import { PdfExtractionStatus } from '../../domain/enums/pdf-extraction-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';

class PortfolioCorrectionServiceStub {
    readonly findByIdAndUserIdOrThrow = jest.fn<
        Promise<{
            pdfExtractionStatus: PdfExtractionStatus;
            originalFileName: string | null;
        }>,
        [number, number]
    >();
    readonly updatePdfExtractionStatus = jest.fn<Promise<void>, [number, PdfExtractionStatus]>();
    readonly updateOriginalFileName = jest.fn<Promise<void>, [number, string]>();
}

class CorrectionMaterialServiceStub {
    readonly findByCorrectionId = jest.fn<Promise<CorrectionMaterial[]>, [number]>();
    readonly countByCorrectionId = jest.fn<Promise<number>, [number]>();
    readonly createEmptyMaterial = jest.fn<Promise<CorrectionMaterial>, [number]>();
    readonly updateMaterial = jest.fn<
        Promise<CorrectionMaterial>,
        [number, number, Partial<CorrectionMaterial>]
    >();
    readonly deleteMaterial = jest.fn<Promise<void>, [number, number]>();
    readonly findByIdAndUserIdOrThrow = jest.fn<Promise<CorrectionMaterial>, [number, number]>();
}

class CorrectionItemServiceStub {
    readonly deleteByMaterialId = jest.fn<Promise<void>, [number]>();
}

class PdfExtractServiceStub {
    readonly extractText = jest.fn<Promise<{ message: string }>, [number, Buffer, string]>();
}

const createMaterial = (
    id: number,
    overrides: Partial<CorrectionMaterial> = {}
): CorrectionMaterial => {
    const material = new CorrectionMaterial();
    material.id = id;
    material.name = overrides.name ?? 'A';
    material.description = overrides.description ?? 'D';
    material.responsibilities = overrides.responsibilities ?? 'R';
    material.problemSolving = overrides.problemSolving ?? 'P';
    material.learnings = overrides.learnings ?? 'L';
    return material;
};

describe('ExternalPortfolioFacade', () => {
    let externalPortfolioFacade: ExternalPortfolioFacade;
    let portfolioCorrectionServiceStub: PortfolioCorrectionServiceStub;
    let correctionMaterialServiceStub: CorrectionMaterialServiceStub;
    let correctionItemServiceStub: CorrectionItemServiceStub;
    let pdfExtractServiceStub: PdfExtractServiceStub;

    beforeEach(() => {
        portfolioCorrectionServiceStub = new PortfolioCorrectionServiceStub();
        correctionMaterialServiceStub = new CorrectionMaterialServiceStub();
        correctionItemServiceStub = new CorrectionItemServiceStub();
        pdfExtractServiceStub = new PdfExtractServiceStub();

        externalPortfolioFacade = new ExternalPortfolioFacade(
            portfolioCorrectionServiceStub as unknown as PortfolioCorrectionService,
            correctionMaterialServiceStub as unknown as CorrectionMaterialService,
            correctionItemServiceStub as unknown as CorrectionItemService,
            pdfExtractServiceStub as unknown as PdfExtractService
        );
    });

    it('stores original file name when extraction is accepted', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.NONE,
            originalFileName: null,
        });
        pdfExtractServiceStub.extractText.mockResolvedValue({
            message: 'ok',
        });

        const result = await externalPortfolioFacade.extractPortfolio(
            9,
            1,
            Buffer.from('pdf'),
            'resume.pdf'
        );

        expect(result).toBe('ok');
        expect(portfolioCorrectionServiceStub.updatePdfExtractionStatus).toHaveBeenCalledWith(
            1,
            PdfExtractionStatus.GENERATING
        );
        expect(portfolioCorrectionServiceStub.updateOriginalFileName).toHaveBeenCalledWith(
            1,
            'resume.pdf'
        );
    });

    it('returns top-level pdf extraction status with materials list', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: 'portfolio.pdf',
        });
        correctionMaterialServiceStub.findByCorrectionId.mockResolvedValue([
            createMaterial(10, {
                name: 'A',
                description: 'D1',
                responsibilities: 'R1',
                problemSolving: 'P1',
                learnings: 'L1',
            }),
            createMaterial(20, {
                name: 'B',
                description: 'D2',
                responsibilities: 'R2',
                problemSolving: 'P2',
                learnings: 'L2',
            }),
        ]);

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.status).toBe(PdfExtractionStatus.GENERATING);
        expect(result.originalFileName).toBe('portfolio.pdf');
        expect(result.portfolios).toEqual([
            {
                portfolioId: 10,
                name: 'A',
                description: 'D1',
                responsibilities: 'R1',
                problemSolving: 'P1',
                learnings: 'L1',
            },
            {
                portfolioId: 20,
                name: 'B',
                description: 'D2',
                responsibilities: 'R2',
                problemSolving: 'P2',
                learnings: 'L2',
            },
        ]);
    });

    it('normalizes legacy mojibake original file name on get response', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: 'Ã¬Â²Â¨Ã¬ÂÂ­_Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ.pdf',
        });
        correctionMaterialServiceStub.findByCorrectionId.mockResolvedValue([]);

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.originalFileName).toBe('첨삭_이력서.pdf');
        expect(result.portfolios).toEqual([]);
    });

    it('normalizes NFD original file name to NFC on get response', async () => {
        const nfcName = '첨삭_이력서.pdf';
        const nfdName = nfcName.normalize('NFD');
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: nfdName,
        });
        correctionMaterialServiceStub.findByCorrectionId.mockResolvedValue([]);

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.originalFileName).toBe(nfcName);
        expect(result.originalFileName?.normalize('NFC')).toBe(result.originalFileName);
        expect(result.originalFileName).not.toBe(nfdName);
    });

    it('sanitizes directory and control characters on get response', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: 'C:\\fakepath\\folioo\u0000-report.pdf',
        });
        correctionMaterialServiceStub.findByCorrectionId.mockResolvedValue([]);

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.originalFileName).toBe('folioo-report.pdf');
    });

    it('creates a new empty material block when under the limit', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.NONE,
            originalFileName: null,
        });
        correctionMaterialServiceStub.countByCorrectionId.mockResolvedValue(1);
        correctionMaterialServiceStub.createEmptyMaterial.mockResolvedValue(createMaterial(30));

        const result = await externalPortfolioFacade.createExternalPortfolioBlock(1, 9);

        expect(correctionMaterialServiceStub.createEmptyMaterial).toHaveBeenCalledWith(1);
        expect(result.portfolioId).toBe(30);
    });

    it('rejects creating a new material block once the limit is reached', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.NONE,
            originalFileName: null,
        });
        correctionMaterialServiceStub.countByCorrectionId.mockResolvedValue(5);

        await expect(externalPortfolioFacade.createExternalPortfolioBlock(1, 9)).rejects.toThrow(
            BusinessException
        );
        expect(correctionMaterialServiceStub.createEmptyMaterial).not.toHaveBeenCalled();
    });

    it('deletes related correction items before deleting the material', async () => {
        correctionMaterialServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue(
            createMaterial(55)
        );
        correctionItemServiceStub.deleteByMaterialId.mockResolvedValue();
        correctionMaterialServiceStub.deleteMaterial.mockResolvedValue();

        await externalPortfolioFacade.deleteExternalPortfolio(55, 9);

        expect(correctionMaterialServiceStub.findByIdAndUserIdOrThrow).toHaveBeenCalledWith(55, 9);
        expect(correctionItemServiceStub.deleteByMaterialId).toHaveBeenCalledWith(55);
        expect(correctionMaterialServiceStub.deleteMaterial).toHaveBeenCalledWith(55, 9);

        const itemDeleteOrder =
            correctionItemServiceStub.deleteByMaterialId.mock.invocationCallOrder[0];
        const materialDeleteOrder =
            correctionMaterialServiceStub.deleteMaterial.mock.invocationCallOrder[0];
        expect(itemDeleteOrder).toBeLessThan(materialDeleteOrder);
    });

    it('does not delete related data when ownership validation fails', async () => {
        const validationError = new Error('validation failed');
        correctionMaterialServiceStub.findByIdAndUserIdOrThrow.mockRejectedValue(validationError);

        await expect(externalPortfolioFacade.deleteExternalPortfolio(55, 9)).rejects.toThrow(
            validationError
        );

        expect(correctionItemServiceStub.deleteByMaterialId).not.toHaveBeenCalled();
        expect(correctionMaterialServiceStub.deleteMaterial).not.toHaveBeenCalled();
    });
});
