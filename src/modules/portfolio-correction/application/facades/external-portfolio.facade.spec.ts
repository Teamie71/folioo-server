jest.mock('typeorm-transactional', () => ({
    Transactional: () => {
        return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) =>
            descriptor;
    },
}));

import { ExternalPortfolioFacade } from './external-portfolio.facade';
import { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionPortfolioSelectionService } from '../services/correction-portfolio-selection.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { PdfExtractService } from '../services/pdf-extract.service';

class ExternalPortfolioServiceStub {
    readonly deleteExternalPortfolio = jest.fn<Promise<void>, [number, number]>();
}

class PortfolioServiceStub {}

class PortfolioCorrectionServiceStub {}

class CorrectionPortfolioSelectionServiceStub {
    readonly deleteByPortfolioId = jest.fn<Promise<void>, [number]>();
}

class CorrectionItemServiceStub {
    readonly deleteByPortfolioId = jest.fn<Promise<void>, [number]>();
}

class PdfExtractServiceStub {}

describe('ExternalPortfolioFacade', () => {
    let externalPortfolioFacade: ExternalPortfolioFacade;
    let externalPortfolioServiceStub: ExternalPortfolioServiceStub;
    let correctionPortfolioSelectionServiceStub: CorrectionPortfolioSelectionServiceStub;
    let correctionItemServiceStub: CorrectionItemServiceStub;

    beforeEach(() => {
        externalPortfolioServiceStub = new ExternalPortfolioServiceStub();
        correctionPortfolioSelectionServiceStub = new CorrectionPortfolioSelectionServiceStub();
        correctionItemServiceStub = new CorrectionItemServiceStub();

        externalPortfolioFacade = new ExternalPortfolioFacade(
            externalPortfolioServiceStub as unknown as ExternalPortfolioService,
            new PortfolioServiceStub() as unknown as PortfolioService,
            new PortfolioCorrectionServiceStub() as unknown as PortfolioCorrectionService,
            correctionPortfolioSelectionServiceStub as unknown as CorrectionPortfolioSelectionService,
            correctionItemServiceStub as unknown as CorrectionItemService,
            new PdfExtractServiceStub() as unknown as PdfExtractService
        );
    });

    it('deletes correction links first, then deletes external portfolio', async () => {
        correctionItemServiceStub.deleteByPortfolioId.mockResolvedValue();
        correctionPortfolioSelectionServiceStub.deleteByPortfolioId.mockResolvedValue();
        externalPortfolioServiceStub.deleteExternalPortfolio.mockResolvedValue();

        await externalPortfolioFacade.deleteExternalPortfolio(55, 9);

        expect(correctionItemServiceStub.deleteByPortfolioId).toHaveBeenCalledWith(55);
        expect(correctionPortfolioSelectionServiceStub.deleteByPortfolioId).toHaveBeenCalledWith(
            55
        );
        expect(externalPortfolioServiceStub.deleteExternalPortfolio).toHaveBeenCalledWith(55, 9);

        const itemDeleteOrder =
            correctionItemServiceStub.deleteByPortfolioId.mock.invocationCallOrder[0];
        const selectionDeleteOrder =
            correctionPortfolioSelectionServiceStub.deleteByPortfolioId.mock.invocationCallOrder[0];
        const portfolioDeleteOrder =
            externalPortfolioServiceStub.deleteExternalPortfolio.mock.invocationCallOrder[0];

        expect(itemDeleteOrder).toBeLessThan(selectionDeleteOrder);
        expect(selectionDeleteOrder).toBeLessThan(portfolioDeleteOrder);
    });
});
