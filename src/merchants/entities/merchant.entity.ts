import { Exclude, Expose } from 'class-transformer';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { User } from 'src/users/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Merchant {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ nullable: true })
  address: string;

  @Expose()
  @Column('jsonb', { nullable: true })
  other_details: object;

  @Expose()
  @Column({ name: 'user_id' })
  user_id: string;

  @Exclude()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Exclude()
  @OneToMany(() => Receipt, (receipt) => receipt.merchant)
  receipts: Receipt[];

  @Expose()
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Expose()
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
