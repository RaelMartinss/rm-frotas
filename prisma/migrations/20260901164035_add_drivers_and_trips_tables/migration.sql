-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnh_number" TEXT NOT NULL,
    "cnh_category" TEXT NOT NULL,
    "cnh_expiration_date" TIMESTAMP(3) NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "origin_address" TEXT NOT NULL,
    "origin_city" TEXT NOT NULL,
    "origin_state" TEXT NOT NULL,
    "origin_latitude" DOUBLE PRECISION,
    "origin_longitude" DOUBLE PRECISION,
    "destination_address" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "destination_state" TEXT NOT NULL,
    "destination_latitude" DOUBLE PRECISION,
    "destination_longitude" DOUBLE PRECISION,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_cpf_key" ON "drivers"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_cnh_number_key" ON "drivers"("cnh_number");

-- CreateIndex
CREATE INDEX "trips_vehicle_id_status_idx" ON "trips"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "trips_driver_id_status_idx" ON "trips"("driver_id", "status");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
