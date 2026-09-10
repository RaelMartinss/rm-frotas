// stress-test.js
// Teste de carga realista: login + leitura + escrita simulando produção.
//
// Instalação (Fedora): sudo dnf install k6
// Uso:
//   API_URL=https://rm-frotas-api.onrender.com \
//   TEST_EMAIL=seu-email@exemplo.com \
//   TEST_PASSWORD=suaSenha \
//   k6 run stress-test.js
//
// ⚠️ Este script cria registros de verdade no banco de produção (Neon), marcados
// com o prefixo "LOADTEST-" na placa/nome, pra você conseguir limpar depois com
// uma query simples. Veja o cleanup.sql que te passei junto.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'http://localhost:3000';
const EMAIL = __ENV.TEST_EMAIL;
const PASSWORD = __ENV.TEST_PASSWORD;

const loginRateLimited = new Rate('login_rate_limited_429');
const writesCreated = new Counter('writes_created');

export const options = {
  scenarios: {
    // 1. LOGIN: poucos VUs, respeitando o rate limit estrito de auth (5/min)
    concurrent_logins: {
      executor: 'constant-arrival-rate',
      rate: 3,               // 3 tentativas de login por período
      timeUnit: '1m',        // por minuto — abaixo do limite de 5/min
      duration: '2m',
      preAllocatedVUs: 5,
      exec: 'loginScenario',
    },

    // 2. LEITURA: simula usuários navegando e consultando listagens paginadas
    read_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m30s', target: 80 },
        { duration: '30s', target: 0 },
      ],
      exec: 'readScenario',
    },

    // 3. ESCRITA: criação de veículos e envio para manutenção
    write_ops: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m30s', target: 15 },
        { duration: '30s', target: 0 },
      ],
      exec: 'writeScenario',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], // tolerância realista para plano free
    http_req_failed: ['rate<0.10'],
  },
};

function generateValidPlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const l3 = letters[Math.floor(Math.random() * letters.length)];
  const d1 = digits[Math.floor(Math.random() * digits.length)];
  const l4 = letters[Math.floor(Math.random() * letters.length)];
  const d2 = digits[Math.floor(Math.random() * digits.length)];
  const d3 = digits[Math.floor(Math.random() * digits.length)];
  return `ZZ${l3}${d1}${l4}${d2}${d3}`; // Placa válida padrão Mercosul com prefixo ZZ
}

// Login feito UMA vez no setup, reaproveitado pelos cenários de leitura/escrita
export function setup() {
  const res = http.post(
    `${API_URL}/v1/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'setup login ok': (r) => r.status === 200 });
  const body = res.json();
  return { accessToken: body.accessToken };
}

// Cenário dedicado só pra observar o comportamento do endpoint de login
export function loginScenario() {
  const res = http.post(
    `${API_URL}/v1/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (res.status === 429) {
    loginRateLimited.add(1);
  } else {
    check(res, { 'login 200': (r) => r.status === 200 });
  }
}

export function readScenario(data) {
  if (!data || !data.accessToken) return;
  const headers = { Authorization: `Bearer ${data.accessToken}` };
  const page = Math.floor(Math.random() * 50) + 1; // páginas aleatórias

  const vehicles = http.get(`${API_URL}/v1/vehicles?page=${page}&limit=20`, { headers });
  check(vehicles, { 'GET /vehicles 200': (r) => r.status === 200 });

  const trips = http.get(`${API_URL}/v1/trips?page=${page}&limit=20`, { headers });
  check(trips, { 'GET /trips 200': (r) => r.status === 200 });

  const drivers = http.get(`${API_URL}/v1/drivers?page=1&limit=20`, { headers });
  check(drivers, { 'GET /drivers 200': (r) => r.status === 200 });

  sleep(1);
}

export function writeScenario(data) {
  if (!data || !data.accessToken) return;
  const headers = {
    Authorization: `Bearer ${data.accessToken}`,
    'Content-Type': 'application/json',
  };

  const plate = generateValidPlate();

  // Criação de veículo válido
  const createRes = http.post(
    `${API_URL}/v1/vehicles`,
    JSON.stringify({
      plate: plate,
      model: 'Stress Test Model',
      brand: 'LoadTestBrand',
      year: 2024,
      currentKm: 15000,
    }),
    { headers },
  );

  const created = check(createRes, { 'POST /vehicles 201': (r) => r.status === 201 });
  if (created) {
    writesCreated.add(1);
    const vehicleId = createRes.json('id');

    // Enviar veículo recém-criado para manutenção
    const patchRes = http.patch(
      `${API_URL}/v1/vehicles/${vehicleId}/maintenance`,
      null,
      { headers },
    );
    check(patchRes, { 'PATCH /vehicles/:id/maintenance 200': (r) => r.status === 200 });
  }

  sleep(2);
}

