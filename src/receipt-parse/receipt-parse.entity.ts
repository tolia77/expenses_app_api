import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { User } from 'src/users/user.entity';

@Entity('receipt_parse')
@Index('idx_receipt_parse_receipt_id_created_at', ['receipt_id', 'created_at'])
@Index('idx_receipt_parse_status_created_at', ['status', 'created_at'])
export class ReceiptParse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'receipt_id' })
  receipt_id: string;

  @ManyToOne(() => Receipt, (receipt) => receipt.parses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receipt_id' })
  receipt: Receipt;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'parsed' | 'failed';

  @Column({ type: 'varchar', nullable: true })
  model: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  duration_ms: number;

  @Column({ type: 'int', nullable: true, name: 'prompt_tokens' })
  prompt_tokens: number;

  @Column({ type: 'int', nullable: true, name: 'completion_tokens' })
  completion_tokens: number;

  @Column({ type: 'int', nullable: true, name: 'total_tokens' })
  total_tokens: number;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_response' })
  raw_response: object;

  @Column({ type: 'varchar', nullable: true, name: 'error_code' })
  error_code: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  error_message: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'finished_at' })
  finished_at: Date;
}
