-- CreateIndex
CREATE INDEX "fuel_records_client_id_vehicle_id_fueled_at_idx" ON "fuel_records"("client_id", "vehicle_id", "fueled_at");

-- CreateIndex
CREATE INDEX "maintenances_client_id_vehicle_id_finished_at_idx" ON "maintenances"("client_id", "vehicle_id", "finished_at");

-- CreateIndex
CREATE INDEX "odometer_readings_client_id_vehicle_id_recorded_at_idx" ON "odometer_readings"("client_id", "vehicle_id", "recorded_at");
