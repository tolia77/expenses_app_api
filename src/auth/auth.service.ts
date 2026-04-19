import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AppException } from '../common/exceptions/app.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<{ access_token: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new AppException(
        'USER_ALREADY_EXISTS',
        'Email already registered',
        HttpStatus.CONFLICT,
      );
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
        throw new AppException(
          'USER_ALREADY_EXISTS',
          'Email already registered',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordMatch = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatch) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { access_token: token };
  }
}
