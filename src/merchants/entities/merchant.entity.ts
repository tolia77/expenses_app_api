import { Receipt } from 'src/receipts/entities/receipt.entity';
import { User } from 'src/users/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';

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

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => Receipt, (receipt) => receipt.merchant)
  receipts: Receipt[];
}
