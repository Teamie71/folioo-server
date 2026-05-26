jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: object, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

import { InternalVisualizationFacade } from './internal-visualization.facade';
import { VisualizationJobService } from 'src/modules/visualization/application/services/visualization-job.service';
import { VisualizationSlideService } from 'src/modules/visualization/application/services/visualization-slide.service';
import { SaveSlidePlanReqDTO } from '../dtos/internal-visualization.dto';
import { VisualizationJob } from 'src/modules/visualization/domain/visualization-job.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const TEMPLATE_ID = 'blue';

function makeJob(overrides: Partial<VisualizationJob> = {}): VisualizationJob {
    return { id: JOB_ID, templateId: TEMPLATE_ID, ...overrides } as VisualizationJob;
}

function makeBody(overrides: Partial<SaveSlidePlanReqDTO> = {}): SaveSlidePlanReqDTO {
    return {
        totalSlides: 2,
        templateId: TEMPLATE_ID,
        slidePlan: { llm_model: 'gpt-4o', selected_slides: [] },
        slides: [
            { slideOrder: 1, sourceSlideId: 'cover_A', slideFilename: 'slide1.xml' },
            { slideOrder: 2, sourceSlideId: 'intro_B', slideFilename: 'slide2.xml' },
        ],
        idempotencyKey: 'evt-uuid-1',
        schemaVersion: 1,
        ...overrides,
    };
}

describe('InternalVisualizationFacade', () => {
    let facade: InternalVisualizationFacade;

    let findByIdOrThrow: jest.Mock;
    let updateSlidePlan: jest.Mock;
    let bulkInsert: jest.Mock;

    beforeEach(() => {
        findByIdOrThrow = jest.fn().mockResolvedValue(makeJob());
        updateSlidePlan = jest.fn();
        bulkInsert = jest.fn();

        const vizJobService = {
            findByIdOrThrow,
            updateSlidePlan,
        } as unknown as VisualizationJobService;

        const vizSlideService = {
            bulkInsert,
        } as unknown as VisualizationSlideService;

        facade = new InternalVisualizationFacade(vizJobService, vizSlideService);
    });

    describe('saveSlidePlan', () => {
        describe('입력 검증', () => {
            it('totalSlides와 slides 배열 길이가 다르면 BAD_REQUEST를 던진다', async () => {
                const body = makeBody({ totalSlides: 3 }); // slides는 2개

                await expect(facade.saveSlidePlan(JOB_ID, body)).rejects.toThrow(BusinessException);
                expect(findByIdOrThrow).not.toHaveBeenCalled();
            });
        });

        describe('job 검증', () => {
            it('job이 존재하지 않으면 VISUALIZATION_JOB_NOT_FOUND가 전파된다', async () => {
                findByIdOrThrow.mockRejectedValue(
                    new BusinessException(ErrorCode.VISUALIZATION_JOB_NOT_FOUND)
                );

                await expect(facade.saveSlidePlan(JOB_ID, makeBody())).rejects.toThrow(
                    BusinessException
                );
                expect(updateSlidePlan).not.toHaveBeenCalled();
            });

            it('templateId가 job에 등록된 값과 다르면 VISUALIZATION_TEMPLATE_ID_MISMATCH를 던진다', async () => {
                findByIdOrThrow.mockResolvedValue(makeJob({ templateId: 'red' }));
                const body = makeBody({ templateId: 'blue' });

                await expect(facade.saveSlidePlan(JOB_ID, body)).rejects.toMatchObject({
                    response: { errorCode: ErrorCode.VISUALIZATION_TEMPLATE_ID_MISMATCH },
                });
                expect(updateSlidePlan).not.toHaveBeenCalled();
            });
        });

        describe('성공 케이스', () => {
            it('updateSlidePlan을 올바른 인자로 호출한다', async () => {
                const body = makeBody();

                await facade.saveSlidePlan(JOB_ID, body);

                expect(updateSlidePlan).toHaveBeenCalledWith(
                    JOB_ID,
                    body.totalSlides,
                    body.slidePlan
                );
            });

            it('bulkInsert를 올바른 인자로 호출한다', async () => {
                const body = makeBody();

                await facade.saveSlidePlan(JOB_ID, body);

                expect(bulkInsert).toHaveBeenCalledWith(JOB_ID, body.slides);
            });

            it('중복 콜백이 와도 예외 없이 bulkInsert를 위임한다 (ON CONFLICT DO NOTHING은 레포 레벨 처리)', async () => {
                const body = makeBody();

                await facade.saveSlidePlan(JOB_ID, body);
                await facade.saveSlidePlan(JOB_ID, body);

                expect(bulkInsert).toHaveBeenCalledTimes(2);
            });
        });
    });
});
