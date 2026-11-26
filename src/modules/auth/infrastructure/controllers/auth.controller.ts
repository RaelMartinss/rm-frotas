import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Optional,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { IRefreshTokenSessionRepository } from '../../domain/repositories/refresh-token-session.repository.interface';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { ChangeOwnPasswordUseCase } from '../../application/use-cases/change-own-password.use-case';
import { LogoutAllDevicesUseCase } from '../../application/use-cases/logout-all-devices.use-case';
import { VerifyPasswordUseCase } from '../../application/use-cases/verify-password.use-case';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { LogoutAllDevicesDto } from './dtos/logout-all-devices.dto';
import { VerifyPasswordDto } from './dtos/verify-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole } from '../../domain/entities/user.entity';

const REFRESH_COOKIE_NAME = 'refresh_token';
const isProduction = process.env.NODE_ENV === 'production';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  path: '/',
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly changeOwnPasswordUseCase: ChangeOwnPasswordUseCase,
    private readonly logoutAllDevicesUseCase: LogoutAllDevicesUseCase,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    @Optional()
    @Inject('IRefreshTokenSessionRepository')
    private readonly refreshTokenSessionRepository?: IRefreshTokenSessionRepository,
  ) {}

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Alterar a própria senha (usado para primeiro acesso com senha temporária ou troca regular)',
  })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso.' })
  async changePassword(
    @Req() req: Request,
    @CurrentUser('userId') currentUserId: string,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const isMobileUa =
      typeof userAgent === 'string' &&
      (userAgent.includes('okhttp') ||
        userAgent.includes('Expo') ||
        userAgent.includes('Android') ||
        userAgent.includes('Darwin') ||
        !req.cookies?.[REFRESH_COOKIE_NAME]);

    const result = await this.changeOwnPasswordUseCase.execute({
      userId: currentUserId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      deviceInfo: {
        platform: isMobileUa ? 'mobile' : 'web',
        userAgent,
      },
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    return {
      message: result.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo usuário no sistema (desativado publicamente em produção)' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  @ApiResponse({ status: 403, description: 'Auto-cadastro público desativado em produção.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  async register(@Body() body: RegisterDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'O auto-cadastro público está desativado. Solicite seu acesso ao administrador da frota.',
      );
    }

    if (body.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Não é permitido criar contas SUPER_ADMIN por este endpoint.');
    }

    const user = await this.registerUserUseCase.execute(body);

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      createdAt: user.getCreatedAt(),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e obter token JWT de acesso' })
  @ApiResponse({
    status: 200,
    description:
      'Autenticação realizada com sucesso (retorna accessToken, refreshToken e grava cookie HttpOnly).',
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  async login(
    @Req() req: Request,
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const deviceInfo = body.deviceInfo ?? {
      platform: 'web',
      userAgent,
    };

    const { accessToken, refreshToken, expiresIn, user } =
      await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
        deviceInfo: {
          platform: deviceInfo.platform,
          userAgent: deviceInfo.userAgent ?? userAgent,
        },
      });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user,
    };
  }

  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Autenticar exclusivamente usuário com papel SUPER_ADMIN no portal administrativo',
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticação de Super Admin realizada com sucesso.',
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado: usuário não possui privilégios de Super Admin.',
  })
  async adminLogin(
    @Req() req: Request,
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const deviceInfo = body.deviceInfo ?? {
      platform: 'web',
      userAgent,
    };

    const { accessToken, refreshToken, expiresIn, user } =
      await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
        deviceInfo: {
          platform: deviceInfo.platform,
          userAgent: deviceInfo.userAgent ?? userAgent,
        },
      });

    // Barreira de segurança real no backend: valida se o usuário autenticado é SUPER_ADMIN
    if (user.role !== UserRole.SUPER_ADMIN) {
      this.logger.warn(
        `[AUDITORIA SEGURANÇA] Tentativa de login no portal admin recusada para o usuário ${user.email} (Perfil: ${user.role}). IP: ${req.ip}`,
      );
      throw new ForbiddenException(
        'Acesso negado: Este portal é restrito exclusivamente a Super Administradores da plataforma.',
      );
    }

    this.logger.log(
      `[AUDITORIA SEGURANÇA] Super Admin autenticado com sucesso: ${user.email}. IP: ${req.ip}`,
    );

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar access token utilizando o cookie ou corpo JSON com refresh token',
  })
  @ApiResponse({
    status: 200,
    description:
      'Novo accessToken emitido com sucesso e cookie de refresh rotacionado.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token ausente, inválido ou expirado.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { refreshToken?: string },
  ) {
    const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const token = tokenFromCookie || body?.refreshToken;

    if (!token) {
      throw new UnauthorizedException('Token de atualização não encontrado.');
    }

    const { accessToken, refreshToken: newRefreshToken, expiresIn, user } =
      await this.refreshTokenUseCase.execute({ refreshToken: token });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getCookieOptions());

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar sessão, revogar refresh token no banco e limpar cookie' })
  @ApiResponse({ status: 200, description: 'Sessão encerrada com sucesso.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { refreshToken?: string },
  ) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || body?.refreshToken;
    if (token && this.refreshTokenSessionRepository) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const session = await this.refreshTokenSessionRepository.findByTokenHash(tokenHash);
        if (session && !session.isRevoked()) {
          session.revoke();
          await this.refreshTokenSessionRepository.save(session);
        }
      } catch {
        // Falha silenciosa para sempre concluir a limpeza do cliente
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
    });

    return { message: 'Desconectado com sucesso.' };
  }

  @Post('logout-all-devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Encerrar todas as sessões ativas de refresh token de todos os dispositivos',
  })
  @ApiResponse({
    status: 204,
    description: 'Todas as sessões ativas foram encerradas com sucesso.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para encerrar sessões de outro usuário.',
  })
  async logoutAllDevices(
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
    @CurrentUser('clientId') currentClientId: string | null,
    @Body() body: LogoutAllDevicesDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.logoutAllDevicesUseCase.execute({
      currentUserId,
      currentUserRole,
      currentClientId,
      targetUserId: body?.userId,
    });

    // Se o usuário estiver deslogando a si mesmo, limpa também o cookie
    if (!body?.userId || body.userId === currentUserId) {
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
        path: '/',
      });
    }
  }

  @Post('verify-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Verificar senha atual do usuário autenticado para desbloqueio de inatividade',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da verificação de senha ({ valid: boolean }).',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async verifyPassword(
    @CurrentUser('userId') currentUserId: string,
    @Body() body: VerifyPasswordDto,
  ) {
    return this.verifyPasswordUseCase.execute({
      userId: currentUserId,
      password: body.password,
    });
  }
}