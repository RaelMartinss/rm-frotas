import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { PrismaUsersRepository } from './infrastructure/repositories/prisma-users.repository';
import { NestJwtTokenGenerator } from './infrastructure/cryptography/nest-jwt-token-generator';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { ProfileController } from './infrastructure/controllers/profile.controller';
import { UsersController } from './infrastructure/controllers/users.controller';
import { RolesGuard } from './infrastructure/guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const isCI = !!config.get<string>('CI');
        if (isProd && !isCI && (!secret || secret === 'default-secret-key')) {
          throw new Error(
            'FATAL: JWT_SECRET deve ser configurado com uma chave forte e segura em ambiente de produção.',
          );
        }
        return {
          secret: secret || 'default-secret-key',
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  controllers: [AuthController, ProfileController, UsersController],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    JwtStrategy,
    RolesGuard,
    {
      provide: 'IUsersRepository',
      useClass: PrismaUsersRepository,
    },
    {
      provide: 'ITokenGenerator',
      useClass: NestJwtTokenGenerator,
    },
  ],
  exports: [
    'IUsersRepository',
    'ITokenGenerator',
    JwtModule,
    PassportModule,
    RolesGuard,
  ],
})
export class AuthModule {}