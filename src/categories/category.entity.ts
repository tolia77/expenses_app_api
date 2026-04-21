import { Expose } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Category {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ unique: true })
  name: string;

  @Expose()
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Expose()
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
