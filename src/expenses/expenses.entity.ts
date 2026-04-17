import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { Category } from 'src/categories/category.entity';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @ManyToOne(() => Receipt, (receipt) => receipt.expenses, {
    onDelete: 'CASCADE',
  })
  receipt: Receipt;

  @Column()
  categoryId: string;

  @ManyToOne(() => Category)
  category: Category;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  unit_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'jsonb', nullable: true })
  other_details: object;
}
