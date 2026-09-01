import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { PrismaUsersRepository } from './infrastructure/repositories/prisma-users.repository';
import { NestJwtTokenGenerator } from './infrastructure/cryptography/nest-jwt-token-generator';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default-secret-key'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,
    JwtStrategy,
    {
      provide: 'IUsersRepository',
      useClass: PrismaUsersRepository,
    },
    {
      provide: 'ITokenGenerator',
      useClass: NestJwtTokenGenerator,
    },
  ],
  exports: ['IUsersRepository', JwtModule, PassportModule],
})
export class AuthModule {}