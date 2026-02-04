import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class Activity extends BaseEntity {
    @Column({ length: 20, unique: true })
    name: string;
}
