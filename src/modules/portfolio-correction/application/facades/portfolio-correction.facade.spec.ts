jest.mock('typeorm-transactional', () => ({
    Transactional: () => {
        return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) =>
            descriptor;
    },
}));

import { PortfolioCorrectionFacade } from './portfolio-correction.facade';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { CorrectionPortfolioSelectionService } from '../services/correction-portfolio-selection.service';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    AiRelayGetRequest,
    AiRelayJsonResponse,
    AiRelayPort,
    AiRelayRequest,
} from 'src/common/ports/ai-relay.port';

class PortfolioCorrectionServiceStub {
    readonly findByIdAndUserIdOrThrow = jest.fn<Promise<{ id: number }>, [number, number]>();
    readonly transitionToGenerating = jest.fn<Promise<void>, [number]>();
}

class CorrectionItemServiceStub {
    readonly deleteByCorrectionId = jest.fn<Promise<void>, [number]>();
    readonly createCorrectionItem = jest.fn<Promise<unknown>, [unknown, unknown]>();
}

class PortfolioServiceStub {
    readonly findByIdsAndUserIdOrThrow = jest.fn<Promise<unknown[]>, [number[], number]>();
}

class CorrectionPortfolioSelectionServiceStub {
    readonly findActivePortfolioIdsByCorrectionId = jest.fn<Promise<number[]>, [number]>();
    readonly activateSelections = jest.fn<Promise<unknown[]>, [unknown, unknown[]]>();
}

class AiRelayPortStub extends AiRelayPort {
    readonly postJsonMock = jest.fn<Promise<AiRelayJsonResponse>, [AiRelayRequest]>();

    getJson<T = unknown>(request: AiRelayGetRequest): Promise<AiRelayJsonResponse<T>> {
        void request;
        throw new Error('Not implemented');
    }

    postJson<T = unknown>(request: AiRelayRequest): Promise<AiRelayJsonResponse<T>> {
        return this.postJsonMock(request) as Promise<AiRelayJsonResponse<T>>;
    }
}

const blockLimitExceeded = {
    response: { errorCode: ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED },
};

describe('PortfolioCorrectionFacade block limit', () => {
    let facade: PortfolioCorrectionFacade;
    let portfolioCorrectionServiceStub: PortfolioCorrectionServiceStub;
    let correctionItemServiceStub: CorrectionItemServiceStub;
    let portfolioServiceStub: PortfolioServiceStub;
    let correctionPortfolioSelectionServiceStub: CorrectionPortfolioSelectionServiceStub;
    let aiRelayPortStub: AiRelayPortStub;

    beforeEach(() => {
        portfolioCorrectionServiceStub = new PortfolioCorrectionServiceStub();
        correctionItemServiceStub = new CorrectionItemServiceStub();
        portfolioServiceStub = new PortfolioServiceStub();
        correctionPortfolioSelectionServiceStub = new CorrectionPortfolioSelectionServiceStub();
        aiRelayPortStub = new AiRelayPortStub();

        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({ id: 1 });

        facade = new PortfolioCorrectionFacade(
            portfolioCorrectionServiceStub as unknown as PortfolioCorrectionService,
            correctionItemServiceStub as unknown as CorrectionItemService,
            portfolioServiceStub as unknown as PortfolioService,
            correctionPortfolioSelectionServiceStub as unknown as CorrectionPortfolioSelectionService,
            aiRelayPortStub
        );
    });

    it('rejects selecting 5 portfolios', async () => {
        await expect(facade.selectPortfolios(1, 9, [10, 20, 30, 40, 50])).rejects.toMatchObject(
            blockLimitExceeded
        );

        expect(portfolioServiceStub.findByIdsAndUserIdOrThrow).not.toHaveBeenCalled();
        expect(correctionPortfolioSelectionServiceStub.activateSelections).not.toHaveBeenCalled();
    });

    it('accepts selecting 4 portfolios, counting duplicate ids once', async () => {
        const portfolios = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }];
        portfolioServiceStub.findByIdsAndUserIdOrThrow.mockResolvedValue(portfolios);
        correctionPortfolioSelectionServiceStub.activateSelections.mockResolvedValue([]);

        await facade.selectPortfolios(1, 9, [10, 20, 30, 40, 40]);

        expect(portfolioServiceStub.findByIdsAndUserIdOrThrow).toHaveBeenCalledWith(
            [10, 20, 30, 40],
            9
        );
        expect(correctionPortfolioSelectionServiceStub.activateSelections).toHaveBeenCalledWith(
            { id: 1 },
            portfolios
        );
    });

    it('rejects generation when 5 portfolios are active', async () => {
        correctionPortfolioSelectionServiceStub.findActivePortfolioIdsByCorrectionId.mockResolvedValue(
            [10, 20, 30, 40, 50]
        );

        await expect(facade.selectAndGenerate(1, 9)).rejects.toMatchObject(blockLimitExceeded);

        expect(correctionItemServiceStub.deleteByCorrectionId).not.toHaveBeenCalled();
        expect(portfolioCorrectionServiceStub.transitionToGenerating).not.toHaveBeenCalled();
        expect(aiRelayPortStub.postJsonMock).not.toHaveBeenCalled();
    });
});
