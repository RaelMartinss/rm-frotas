export class DeviceInfo {
  constructor(
    private readonly platform: 'mobile' | 'web',
    private readonly userAgent?: string,
  ) {}

  isMobile(): boolean {
    return this.platform === 'mobile';
  }

  getPlatform(): 'mobile' | 'web' {
    return this.platform;
  }

  getUserAgent(): string | undefined {
    return this.userAgent;
  }

  static create(platform?: string, userAgent?: string): DeviceInfo {
    const normalizedPlatform = platform?.toLowerCase() === 'mobile' ? 'mobile' : 'web';
    return new DeviceInfo(normalizedPlatform, userAgent);
  }
}
