import { Exclude, Expose, Type } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { Category } from 'src/categories/category.entity';

@Entity()
export class Expense {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ name: 'receipt_id' })
  receipt_id: string;

  @Exclude()
  @ManyToOne(() => Receipt, (receipt) => receipt.expenses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receipt_id' })
  receipt: Receipt;

  @Expose()
  @Column({ name: 'category_id' })
  category_id: string;

  @Expose()
  @Type(() => Category)
  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Expose()
  @Column({ nullable: true })
  unit_type: string;

  @Expose()
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Expose()
  @Column({ type: 'jsonb', nullable: true })
  other_details: object;

  @Expose()
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Expose()
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
