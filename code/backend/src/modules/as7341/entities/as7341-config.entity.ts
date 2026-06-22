import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('as7341_config')
@Index(['sensor'], { unique: true })
export class As7341ConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ type: 'varchar', length: 32, unique: true, default: 'as7341' })
  sensor: string | undefined;

  @Column({ name: 'interval_ms', type: 'int', default: 10000 })
  interval_ms: number | undefined;

  @Column({ type: 'boolean', default: false })
  simulation: boolean | undefined;

  @Column({ type: 'int', default: 29 })
  atime: number | undefined;

  @Column({ type: 'int', default: 599 })
  astep: number | undefined;

  @Column({ type: 'int', default: 128 })
  gain: number | undefined;

  @Column({ name: 'led_enabled', type: 'boolean', default: false })
  led_enabled: boolean | undefined;

  @Column({ name: 'led_current_ma', type: 'int', default: 10 })
  led_current_ma: number | undefined;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date | undefined;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date | undefined;
}
