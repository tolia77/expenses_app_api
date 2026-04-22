import { Exclude, Expose, Type } from 'class-transformer';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { User } from 'src/users/user.entity';
import { Expense } from 'src/expenses/expenses.entity';
import { ReceiptParse } from 'src/receipt-parse-worker/receipt-parse.entity';
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
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ name: 'user_id' })
  user_id: string;

  @Exclude()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Expose()
  @Type(() => Merchant)
  @ManyToOne(() => Merchant, (merchant) => merchant.receipts, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Expose()
  @Column({ nullable: true })
  payment_method: string;

  @Expose()
  @Column({ type: 'timestamp', nullable: true })
  purchased_at: Date;

  @Expose()
  @Column({ type: 'jsonb', nullable: true })
  other_details: object;

  @Exclude()
  @Column({ nullable: true })
  photo_key: string;

  @Expose()
  photo_url: string | null;

  @Expose()
  @CreateDateColumn()
  created_at: Date;

  @Expose()
  @Type(() => Expense)
  @OneToMany(() => Expense, (expense) => expense.receipt)
  expenses: Expense[];

  @Expose()
  @Type(() => ReceiptParse)
  @OneToMany(() => ReceiptParse, (parse) => parse.receipt)
  parses: ReceiptParse[];
}
