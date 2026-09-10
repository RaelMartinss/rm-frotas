import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FcmNotificationService implements OnModuleInit {
  private readonly logger = new Logger(FcmNotificationService.name);
  private firebaseApp: App | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.firebaseApp = existingApps[0];
        this.logger.log('Firebase Admin já inicializado.');
        return;
      }

      // Procura pelo arquivo de credenciais local
      const possiblePaths = [
        path.resolve(process.cwd(), 'firebase-service-account.json'),
        path.resolve(__dirname, '../../../../firebase-service-account.json'),
        path.resolve(process.cwd(), 'rm-frotas-app-firebase-adminsdk.json'),
      ];

      let serviceAccountPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          serviceAccountPath = p;
          break;
        }
      }

      if (serviceAccountPath) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        this.firebaseApp = initializeApp({
          credential: cert(serviceAccount),
        });
        this.logger.log(`Firebase Admin inicializado com sucesso via chave: ${serviceAccountPath}`);
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        this.firebaseApp = initializeApp({
          credential: cert(serviceAccount),
        });
        this.logger.log('Firebase Admin inicializado via variável de ambiente.');
      } else {
        this.logger.warn(
          'Arquivo de credenciais do Firebase (firebase-service-account.json) não encontrado. As notificações Push FCM estarão desativadas.',
        );
      }
    } catch (error) {
      this.logger.error('Erro ao inicializar Firebase Admin SDK:', error);
    }
  }

  /**
   * Envia uma notificação push para um usuário específico pelo ID
   */
  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      this.logger.debug('Firebase não configurado, notificação push não enviada.');
      return false;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true, name: true },
      });

      if (!user || !user.pushToken) {
        this.logger.debug(`Usuário ${userId} não possui token push registrado.`);
        return false;
      }

      return await this.sendPushToToken(user.pushToken, title, body, data);
    } catch (error) {
      this.logger.error(`Falha ao buscar token push do usuário ${userId}:`, error);
      return false;
    }
  }

  /**
   * Envia uma notificação push para um motorista pelo driverId
   */
  async sendPushToDriver(
    driverId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      return false;
    }

    try {
      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
        select: {
          clientId: true,
          name: true,
          pushToken: true,
          user: {
            select: { pushToken: true },
          },
        },
      });

      if (!driver) {
        this.logger.debug(`Motorista ${driverId} não encontrado.`);
        return false;
      }

      let token = driver.pushToken || driver.user?.pushToken;
      if (!token && driver.clientId) {
        const matchingUser = await this.prisma.user.findFirst({
          where: {
            clientId: driver.clientId,
            name: { equals: driver.name, mode: 'insensitive' },
            pushToken: { not: null },
          },
          select: { pushToken: true },
        });
        token = matchingUser?.pushToken ?? null;
      }

      if (!token) {
        this.logger.debug(`Motorista ${driverId} (${driver.name}) não possui token push registrado.`);
        return false;
      }

      return await this.sendPushToToken(token, title, body, data);
    } catch (error) {
      this.logger.error(`Falha ao buscar token push do motorista ${driverId}:`, error);
      return false;
    }
  }

  /**
   * Envia diretamente para um token FCM
   */
  async sendPushToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.firebaseApp || !token) {
      return false;
    }

    try {
      const message: Message = {
        token,
        notification: {
          title,
          body,
        },
        data: {
          title,
          body,
          ...(data || {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'rm_frotas_channel',
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
            priority: 'max',
            visibility: 'public',
          },
        },
      };

      const response = await getMessaging(this.firebaseApp).send(message);
      this.logger.log(`Push notification enviada com sucesso [${response}] para token: ${token.substring(0, 10)}...`);
      return true;
    } catch (error: any) {
      this.logger.error(`Erro ao disparar mensagem Push FCM: ${error?.message || error}`);
      return false;
    }
  }
}
