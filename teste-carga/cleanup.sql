-- cleanup.sql
-- Remove todos os registros criados pelo stress-test.js (identificados pelo prefixo ZZ na placa).
-- Rode com: psql "$NEON_URL" -f cleanup.sql ou via Neon SQL Editor

-- Se houver viagens referenciando veículos de teste, apague-as primeiro (FK)
DELETE FROM trips
WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'ZZ%');

-- Apaga os veículos gerados no teste
DELETE FROM vehicles
WHERE plate LIKE 'ZZ%';

-- Confirma que não sobrou nenhum veículo de teste:
SELECT count(*) AS restantes FROM vehicles WHERE plate LIKE 'ZZ%';

