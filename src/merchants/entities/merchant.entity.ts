import { Receipt } from 'src/receipts/entities/receipt.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity()
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column('jsonb', { nullable: true })
  other_details: object;

  @OneToMany(() => Receipt, (receipt) => receipt.merchant)
  receipts: Receipt[];
}
