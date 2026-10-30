import { BusinessException } from 'src/common/exceptions/business.exception';
import { CorrectionMaterialService } from './correction-material.service';
import { CorrectionMaterialRepository } from '../../infrastructure/repositories/correction-material.repository';
import { CorrectionMaterial } from '../../domain/correction-material.entity';

class CorrectionMaterialRepositoryStub {
    readonly save = jest.fn<Promise<CorrectionMaterial>, [CorrectionMaterial]>();
    readonly saveAll = jest.fn<Promise<CorrectionMaterial[]>, [CorrectionMaterial[]]>();
    readonly findByIdAndUserId = jest.fn<Promise<CorrectionMaterial | null>, [number, number]>();
    readonly findByCorrectionId = jest.fn<Promise<CorrectionMaterial[]>, [number]>();
    readonly countByCorrectionId = jest.fn<Promise<number>, [number]>();
    readonly deleteById = jest.fn<Promise<void>, [number]>();
    readonly deleteByCorrectionId = jest.fn<Promise<void>, [number]>();
}

const createMaterial = (id: number): CorrectionMaterial => {
    const material = new CorrectionMaterial();
    material.id = id;
    material.name = 'A';
    material.description = 'D';
    material.responsibilities = 'R';
    material.problemSolving = 'P';
    material.learnings = 'L';
    return material;
};

describe('CorrectionMaterialService', () => {
    let service: CorrectionMaterialService;
    let repository: CorrectionMaterialRepositoryStub;

    beforeEach(() => {
        repository = new CorrectionMaterialRepositoryStub();
        service = new CorrectionMaterialService(
            repository as unknown as CorrectionMaterialRepository
        );
    });

    it('finds a material by id and userId', async () => {
        const material = createMaterial(1);
        repository.findByIdAndUserId.mockResolvedValue(material);

        await expect(service.findByIdAndUserIdOrThrow(1, 7)).resolves.toBe(material);
        expect(repository.findByIdAndUserId).toHaveBeenCalledWith(1, 7);
    });

    it('throws PORTFOLIO_NOT_FOUND when no material matches id and userId', async () => {
        repository.findByIdAndUserId.mockResolvedValue(null);

        await expect(service.findByIdAndUserIdOrThrow(1, 7)).rejects.toThrow(BusinessException);
    });

    it('creates an empty material for a correction', async () => {
        const saved = createMaterial(5);
        repository.save.mockResolvedValue(saved);

        const result = await service.createEmptyMaterial(3);

        expect(result).toBe(saved);
        expect(repository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                name: '',
                description: '',
                responsibilities: '',
                problemSolving: '',
                learnings: '',
            })
        );
    });

    it('creates multiple materials in bulk from a PDF extraction result', async () => {
        const inputList = [
            { name: 'A', description: 'D1' },
            { name: 'B', description: 'D2' },
        ];
        repository.saveAll.mockImplementation((materials) => Promise.resolve(materials));

        const result = await service.createMaterials(3, inputList);

        expect(result).toHaveLength(2);
        expect(repository.saveAll).toHaveBeenCalledWith([
            expect.objectContaining({ name: 'A', description: 'D1' }),
            expect.objectContaining({ name: 'B', description: 'D2' }),
        ]);
    });

    it('replaces all materials for a correction by deleting then recreating', async () => {
        repository.deleteByCorrectionId.mockResolvedValue();
        repository.saveAll.mockImplementation((materials) => Promise.resolve(materials));

        await service.replaceMaterialsForCorrection(3, [{ name: 'New' }]);

        expect(repository.deleteByCorrectionId).toHaveBeenCalledWith(3);
        expect(repository.saveAll).toHaveBeenCalledWith([expect.objectContaining({ name: 'New' })]);

        const deleteOrder = repository.deleteByCorrectionId.mock.invocationCallOrder[0];
        const saveOrder = repository.saveAll.mock.invocationCallOrder[0];
        expect(deleteOrder).toBeLessThan(saveOrder);
    });

    it('updates an existing material after validating ownership', async () => {
        const material = createMaterial(1);
        repository.findByIdAndUserId.mockResolvedValue(material);
        repository.save.mockImplementation((saved) => Promise.resolve(saved));

        const result = await service.updateMaterial(1, 7, { name: 'Updated' });

        expect(result.name).toBe('Updated');
        expect(repository.save).toHaveBeenCalledWith(material);
    });

    it('rejects updating a material that does not belong to the user', async () => {
        repository.findByIdAndUserId.mockResolvedValue(null);

        await expect(service.updateMaterial(1, 7, { name: 'Updated' })).rejects.toThrow(
            BusinessException
        );
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('deletes a material after validating ownership', async () => {
        repository.findByIdAndUserId.mockResolvedValue(createMaterial(1));
        repository.deleteById.mockResolvedValue();

        await service.deleteMaterial(1, 7);

        expect(repository.deleteById).toHaveBeenCalledWith(1);
    });

    it('rejects deleting a material that does not belong to the user', async () => {
        repository.findByIdAndUserId.mockResolvedValue(null);

        await expect(service.deleteMaterial(1, 7)).rejects.toThrow(BusinessException);
        expect(repository.deleteById).not.toHaveBeenCalled();
    });

    it('finds materials by correction id', async () => {
        const materials = [createMaterial(1), createMaterial(2)];
        repository.findByCorrectionId.mockResolvedValue(materials);

        await expect(service.findByCorrectionId(3)).resolves.toBe(materials);
        expect(repository.findByCorrectionId).toHaveBeenCalledWith(3);
    });

    it('counts materials by correction id', async () => {
        repository.countByCorrectionId.mockResolvedValue(2);

        await expect(service.countByCorrectionId(3)).resolves.toBe(2);
        expect(repository.countByCorrectionId).toHaveBeenCalledWith(3);
    });

    it('deletes all materials for a correction', async () => {
        repository.deleteByCorrectionId.mockResolvedValue();

        await service.deleteByCorrectionId(3);

        expect(repository.deleteByCorrectionId).toHaveBeenCalledWith(3);
    });
});
