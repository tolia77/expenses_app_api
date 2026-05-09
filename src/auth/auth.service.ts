import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
} from '../common/exceptions/domain.errors';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<{ access_token: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new UserAlreadyExistsError();
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.usersService.create({
        email: dto.email,
        password_hash,
      });
      const token = await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      });
      return { access_token: token };
    } catch (err) {
      if (err?.code === '23505') {
        throw new UserAlreadyExistsError();
      }
      throw err;
    }
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatch = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatch) {
      throw new InvalidCredentialsError();
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { access_token: token };
  }
}
