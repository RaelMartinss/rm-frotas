import * as crypto from 'crypto';
import { DeviceInfo } from '../value-objects/device-info.vo';
import { SessionAlreadyRevokedException } from '../exceptions/session-already-revoked.exception';
import { SessionExpiredException } from '../exceptions/session-expired.exception';

export class RefreshTokenSession {
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private readonly tokenHash: string,
    private readonly deviceInfo: DeviceInfo,
    private expiresAt: Date,
    private revokedAt: Date | null,
    private readonly createdAt: Date,
  ) {}

  static create(props: {
    userId: string;
    tokenHash: string;
    deviceInfo: DeviceInfo;
  }): RefreshTokenSession {
    const ttlDays = props.deviceInfo.isMobile() ? 60 : 7;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    return new RefreshTokenSession(
      crypto.randomUUID(),
      props.userId,
      props.tokenHash,
      props.deviceInfo,
      expiresAt,
      null,
      new Date(),
    );
  }

  static restore(props: {
    id: string;
    userId: string;
    tokenHash: string;
    deviceInfo: DeviceInfo;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }): RefreshTokenSession {
    return new RefreshTokenSession(
      props.id,
      props.userId,
      props.tokenHash,
      props.deviceInfo,
      props.expiresAt,
      props.revokedAt,
      props.createdAt,
    );
  }

  isValid(): boolean {
    return this.revokedAt === null && this.expiresAt.getTime() > Date.now();
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(): boolean {
    return this.expiresAt.getTime() <= Date.now();
  }

  revoke(): void {
    if (this.revokedAt) {
      throw new SessionAlreadyRevokedException(this.id);
    }
    this.revokedAt = new Date();
  }

  extend(): void {
    if (!this.isValid()) {
      throw new SessionExpiredException(this.id);
    }
    const ttlDays = this.deviceInfo.isMobile() ? 60 : 7;
    this.expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.userId;
  }

  getTokenHash(): string {
    return this.tokenHash;
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  getRevokedAt(): Date | null {
    return this.revokedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
