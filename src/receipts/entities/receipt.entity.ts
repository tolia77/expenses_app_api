import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Merchant, (merchant) => merchant.receipts, {
    nullable: true,
    eager: true,
  })
  merchant: Merchant;

  @Column({ nullable: true })
  payment_method: string;

  @Column({ type: 'timestamp', nullable: true })
  purchased_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  other_details: object;

  @CreateDateColumn()
  created_at: Date;
}
