-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SuspensionReasonCategory" AS ENUM ('CNH_VENCIDA', 'ACIDENTE', 'PROCESSO_DISCIPLINAR', 'EXAME_TOXICOLOGICO_PENDENTE', 'DOCUMENTACAO_IRREGULAR', 'OUTRO');

-- CreateEnum
CREATE TYPE "SuspensionStatus" AS ENUM ('ATIVA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "MovementState" AS ENUM ('MOVING', 'STOPPED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVA', 'CORRETIVA');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('GASOLINA', 'ETANOL', 'DIESEL', 'DIESEL_S10', 'GNV', 'ELETRICO');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('PNEU', 'MECANICA', 'ELETRICA', 'ACIDENTE', 'ATRASO', 'OUTRO');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "OdometerSource" AS ENUM ('FUEL', 'TRIP', 'MAINTENANCE', 'MANUAL');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photo_url" TEXT,
ADD COLUMN     "push_token" TEXT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "checklist" JSONB,
ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "estimated_arrival_date" TIMESTAMP(3),
ADD COLUMN     "final_odometer" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "scheduled_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "client_id" TEXT,
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "push_token" TEXT,
ADD COLUMN     "temporary_password_set_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "last_event_at" TIMESTAMP(3),
ADD COLUMN     "renavam" TEXT;

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "billing_email" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ATIVO',
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_suspensions" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "reason_category" "SuspensionReasonCategory" NOT NULL,
    "reason_details" TEXT,
    "suspended_by" TEXT NOT NULL,
    "suspended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_return_date" TIMESTAMP(3),
    "indefinite" BOOLEAN NOT NULL DEFAULT false,
    "attachment_url" TEXT,
    "lifted_at" TIMESTAMP(3),
    "lifted_by" TEXT,
    "lift_reason" TEXT,
    "status" "SuspensionStatus" NOT NULL DEFAULT 'ATIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_suspensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_location_pings" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "movement_state" "MovementState",
    "matched_latitude" DOUBLE PRECISION,
    "matched_longitude" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_location_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVA',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'AGENDADA',
    "description" TEXT NOT NULL,
    "service_provider" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "odometer_at_service" INTEGER,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_items" (
    "id" TEXT NOT NULL,
    "maintenance_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_records" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "fuel_type" "FuelType" NOT NULL DEFAULT 'GASOLINA',
    "liters" DOUBLE PRECISION NOT NULL,
    "price_per_unit" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "odometer_at_fueling" INTEGER NOT NULL,
    "gas_station" TEXT,
    "full_tank" BOOLEAN NOT NULL DEFAULT true,
    "receipt_url" TEXT,
    "fueled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odometer_inconsistent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT,
    "vehicle_id" TEXT,
    "trip_id" TEXT,
    "client_id" TEXT NOT NULL,
    "category" "IncidentCategory" NOT NULL DEFAULT 'OUTRO',
    "description" TEXT NOT NULL,
    "protocol" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_address" TEXT,
    "photo_url" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checklist" JSONB,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odometer_readings" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "previous_km" INTEGER NOT NULL,
    "current_km" INTEGER NOT NULL,
    "source" "OdometerSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "corrected_from_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odometer_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "super_admin_user_id" TEXT NOT NULL,
    "target_client_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "impersonation_session_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_document_key" ON "clients"("document");

-- CreateIndex
CREATE INDEX "driver_suspensions_driver_id_status_idx" ON "driver_suspensions"("driver_id", "status");

-- CreateIndex
CREATE INDEX "driver_suspensions_client_id_status_idx" ON "driver_suspensions"("client_id", "status");

-- CreateIndex
CREATE INDEX "driver_suspensions_owner_id_status_idx" ON "driver_suspensions"("owner_id", "status");

-- CreateIndex
CREATE INDEX "trip_location_pings_trip_id_recorded_at_idx" ON "trip_location_pings"("trip_id", "recorded_at");

-- CreateIndex
CREATE INDEX "maintenances_client_id_status_idx" ON "maintenances"("client_id", "status");

-- CreateIndex
CREATE INDEX "maintenances_vehicle_id_status_idx" ON "maintenances"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "maintenances_owner_id_status_idx" ON "maintenances"("owner_id", "status");

-- CreateIndex
CREATE INDEX "fuel_records_client_id_created_at_idx" ON "fuel_records"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "fuel_records_owner_id_created_at_idx" ON "fuel_records"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "fuel_records_vehicle_id_fueled_at_idx" ON "fuel_records"("vehicle_id", "fueled_at");

-- CreateIndex
CREATE INDEX "fuel_records_driver_id_fueled_at_idx" ON "fuel_records"("driver_id", "fueled_at");

-- CreateIndex
CREATE INDEX "incidents_client_id_status_idx" ON "incidents"("client_id", "status");

-- CreateIndex
CREATE INDEX "incidents_trip_id_status_idx" ON "incidents"("trip_id", "status");

-- CreateIndex
CREATE INDEX "incidents_vehicle_id_status_idx" ON "incidents"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "incidents_driver_id_status_idx" ON "incidents"("driver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_sessions_token_hash_key" ON "refresh_token_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_sessions_user_id_idx" ON "refresh_token_sessions"("user_id");

-- CreateIndex
CREATE INDEX "refresh_token_sessions_token_hash_idx" ON "refresh_token_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "odometer_readings_vehicle_id_recorded_at_idx" ON "odometer_readings"("vehicle_id", "recorded_at");

-- CreateIndex
CREATE INDEX "odometer_readings_client_id_recorded_at_idx" ON "odometer_readings"("client_id", "recorded_at");

-- CreateIndex
CREATE INDEX "odometer_readings_owner_id_idx" ON "odometer_readings"("owner_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_super_admin_user_id_ended_at_idx" ON "impersonation_sessions"("super_admin_user_id", "ended_at");

-- CreateIndex
CREATE INDEX "impersonation_sessions_target_client_id_idx" ON "impersonation_sessions"("target_client_id");

-- CreateIndex
CREATE INDEX "audit_logs_impersonation_session_id_idx" ON "audit_logs"("impersonation_session_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");

-- CreateIndex
CREATE INDEX "drivers_client_id_idx" ON "drivers"("client_id");

-- CreateIndex
CREATE INDEX "drivers_client_id_status_idx" ON "drivers"("client_id", "status");

-- CreateIndex
CREATE INDEX "trips_client_id_status_idx" ON "trips"("client_id", "status");

-- CreateIndex
CREATE INDEX "users_client_id_idx" ON "users"("client_id");

-- CreateIndex
CREATE INDEX "vehicles_client_id_idx" ON "vehicles"("client_id");

-- CreateIndex
CREATE INDEX "vehicles_client_id_status_idx" ON "vehicles"("client_id", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_suspensions" ADD CONSTRAINT "driver_suspensions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_suspensions" ADD CONSTRAINT "driver_suspensions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_suspensions" ADD CONSTRAINT "driver_suspensions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_location_pings" ADD CONSTRAINT "trip_location_pings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_items" ADD CONSTRAINT "maintenance_items_maintenance_id_fkey" FOREIGN KEY ("maintenance_id") REFERENCES "maintenances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token_sessions" ADD CONSTRAINT "refresh_token_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_super_admin_user_id_fkey" FOREIGN KEY ("super_admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_target_client_id_fkey" FOREIGN KEY ("target_client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_impersonation_session_id_fkey" FOREIGN KEY ("impersonation_session_id") REFERENCES "impersonation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
