import { Injectable } from '@nestjs/common';
import { SectionKind } from '../../domain/enums/section-kind.enum';
import {
    getAnchorSlot,
    getCategorySlotsForSection,
    getSubTemplatesForSection,
} from '../../domain/templates/template-catalog';
import {
    TemplateCatalogResDTO,
    TemplateSectionResDTO,
    TemplateSlotResDTO,
    TemplateSubTemplateResDTO,
} from '../dtos/template.dto';

@Injectable()
export class TemplateCatalogService {
    getCatalog(): TemplateCatalogResDTO {
        const catalog = new TemplateCatalogResDTO();
        catalog.sections = Object.values(SectionKind).map((sectionKind) =>
            this.buildSection(sectionKind)
        );
        return catalog;
    }

    private buildSection(sectionKind: SectionKind): TemplateSectionResDTO {
        const section = new TemplateSectionResDTO();
        section.sectionKind = sectionKind;
        section.anchorSlotId = getAnchorSlot(sectionKind)?.slotId ?? null;
        section.slots = getCategorySlotsForSection(sectionKind).map((slot) =>
            TemplateSlotResDTO.fromCategorySlot(slot)
        );
        section.subTemplates = getSubTemplatesForSection(sectionKind).map((subTemplate) =>
            TemplateSubTemplateResDTO.from(subTemplate)
        );
        return section;
    }
}
