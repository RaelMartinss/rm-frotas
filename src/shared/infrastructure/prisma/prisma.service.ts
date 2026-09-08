import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private readonly pool: Pool;

    constructor() {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err) => {
            new Logger('PrismaPgPool').warn(`PostgreSQL pool connection error: ${err.message}`);
        });

        const adapter = new PrismaPg(pool, {
            disposeExternalPool: true,
            onPoolError: (err) => {
                new Logger('PrismaPgAdapter').warn(`Prisma PG adapter pool error: ${err.message}`);
            },
            onConnectionError: (err) => {
                new Logger('PrismaPgAdapter').warn(`Prisma PG adapter connection error: ${err.message}`);
            },
        });
        super({ adapter });
        this.pool = pool;
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}