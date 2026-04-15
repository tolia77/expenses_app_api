import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Merchant, (merchant) => merchant.receipts)
  merchant: Merchant;

  @Column({ nullable: true })
  payment_method: string;
}
