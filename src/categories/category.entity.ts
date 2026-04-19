import { Exclude, Expose } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/user.entity';

@Entity()
export class Category {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ name: 'user_id' })
  user_id: string;

  @Exclude()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
