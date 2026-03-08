import { PortfolioCorrection } from './portfolio-correction.entity';
import { JobDescriptionType } from './enums/jobdescription-type.enum';

describe('PortfolioCorrection', () => {
    it('stores the request title as-is', () => {
        const correction = PortfolioCorrection.create(
            1,
            'Backend Resume',
            'Folioo',
            'Backend Developer',
            'JD',
            JobDescriptionType.TEXT
        );

        expect(correction.title).toBe('Backend Resume');
    });
});
