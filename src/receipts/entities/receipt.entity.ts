import { Merchant } from 'src/merchants/entities/merchant.entity';
import { User } from 'src/users/user.entity';
import { Expense } from 'src/expenses/expenses.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';

@Entity()
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Merchant, (merchant) => merchant.receipts, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ nullable: true })
  payment_method: string;

  @Column({ type: 'timestamp', nullable: true })
  purchased_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  other_details: object;

  @Column({ nullable: true })
  photo_key: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Expense, (expense) => expense.receipt)
  expenses: Expense[];
}
