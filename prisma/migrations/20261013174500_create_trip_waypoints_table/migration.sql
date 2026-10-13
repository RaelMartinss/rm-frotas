-- CreateEnum
CREATE TYPE "WaypointType" AS ENUM ('FUEL', 'REST', 'STOP');

-- CreateTable
CREATE TABLE "trip_waypoints" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "type" "WaypointType" NOT NULL DEFAULT 'STOP',
    "title" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_waypoints_trip_id_order_idx" ON "trip_waypoints"("trip_id", "order");

-- AddForeignKey
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

