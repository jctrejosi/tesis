import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('as7341_readings')
export class As7341ReadingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'received_at' })
  received_at!: Date;

  @Column({ type: 'int', default: 0 })
  f1_415nm!: number;

  @Column({ type: 'int', default: 0 })
  f2_445nm!: number;

  @Column({ type: 'int', default: 0 })
  f3_480nm!: number;

  @Column({ type: 'int', default: 0 })
  f4_515nm!: number;

  @Column({ type: 'int', default: 0 })
  f5_555nm!: number;

  @Column({ type: 'int', default: 0 })
  f6_590nm!: number;

  @Column({ type: 'int', default: 0 })
  f7_630nm!: number;

  @Column({ type: 'int', default: 0 })
  f8_680nm!: number;

  @Column({ type: 'int', default: 0 })
  clear!: number;

  @Column({ type: 'int', default: 0 })
  nir!: number;

  @Column({ type: 'jsonb', name: 'raw_payload', nullable: true })
  raw_payload?: Record<string, unknown>;
}
