# 🏢 RM Frotas API — Enterprise Fleet Management Backend

<div align="center">

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

API robusta e escalável para gestão de frotas veiculares, motoristas, viagens e manutenções, construída com **Domain-Driven Design (DDD) tático** e **Clean Architecture**.

[Visão Geral](#-visão-geral) •
[Arquitetura](#-arquitetura--ddd) •
[Segurança](#-segurança--resiliência) •
[Módulos & Endpoints](#-módulos-e-endpoints) •
[Execução Local & Docker](#-execução-local--docker) •
[Testes & CI/CD](#-testes--cicd)

</div>

---

## 📌 Visão Geral

O **RM Frotas API** é o core transacional da plataforma RM Frotas. O projeto foi projetado com foco em manutenibilidade, separação estrita de responsabilidades, alta testabilidade e segurança corporativa.

### Princípios de Engenharia:
- **Separação de Camadas**: Domínio desacoplado de qualquer framework web ou ORM.
- **Isolamento de Dados por Gestor**: Cada registro possui `ownerId`, garantindo que cada gestor visualize e gerencie estritamente seus ativos.
- **Modelagem Explicita**: Separação clara entre `User` (credenciais/identidade de autenticação) e `Driver` (entidade de negócio/condutor).

---

## 🏛 Arquitetura & DDD

Cada bounded context/módulo segue a estrutura de **Clean Architecture**:

```
src/modules/<módulo>/
├── domain/                # Camada mais interna (agnóstica a frameworks)
│   ├── entities/          # Entidades ricas com regras e invariantes
│   ├── value-objects/     # Value Objects imutáveis (Placa, CPF, CNH, etc.)
│   ├── exceptions/        # Exceções de domínio semânticas
│   └── repositories/      # Interfaces abstratas de persistência
│
├── application/           # Casos de uso e orquestração da lógica de negócio
│   └── use-cases/         # CreateVehicleUseCase, ListTripsUseCase, etc.
│
└── infrastructure/        # Detalhes de entrada/saída e adaptadores
    ├── http/              # NestJS Controllers, DTOs de request/response
    └── prisma/            # Implementações concretas dos repositórios via Prisma
```

### Shared Kernel:
- `src/shared/database/`: Provedor do Prisma Client com logging e lifecycle hooks.
- `src/shared/guards/`: `JwtAuthGuard` e `RolesGuard` para controle de acesso granular.
- `src/shared/decorators/`: `@CurrentUser()` e `@Roles(...)`.

---

## 🛡 Segurança & Resiliência

- **Proteção contra Brute Force (Rate Limiting)**:
  - Global: 60 requisições/minuto por IP.
  - Endpoints sensíveis (`/v1/auth/login`, `/v1/me/password`): 5 tentativas/minuto por IP.
- **Headers HTTP com Helmet**: Proteção contra XSS, sniffing de MIME-type e clickjacking.
- **CORS Estrito**: Whitelist configurada via `CORS_ORIGIN`, suporte a subdomínios Vercel (`*.vercel.app`) e credentials ativadas para autenticação segura via cookies/headers.
- **Fail-Fast JWT Validation**: O sistema aborta a inicialização em ambiente de produção caso uma chave JWT fraca ou padrão seja detectada.
- **Tratamento de Exceções Global**: `DomainExceptionFilter` mapeia erros de negócio para respostas HTTP semânticas (400, 404, 409, 422) sem expor detalhes internos de stack trace.
- **Health Checks & Observabilidade**: Endpoint `/v1/health` integrado com `@nestjs/terminus` para probes de liveness e readiness (banco de dados).

---

## 📦 Módulos e Endpoints

Documentação interativa Swagger disponível em `/api` quando a aplicação estiver em execução.

| Módulo | Tag Swagger | Principais Recursos |
|---|---|---|
| **Auth** | `Auth` | Login, Registro de Gestores, Refresh Token e Logout |
| **Profile** | `Profile` | Perfil do usuário logado e troca segura de senha |
| **Dashboard**| `Dashboard` | KPIs consolidados, métricas de frota e distribuição de viagens |
| **Vehicles** | `Vehicles` | Cadastro, listagem paginada, atualização de odômetro e status |
| **Drivers** | `Drivers` | Gestão de condutores, validação de CNH e vínculo de usuário |
| **Trips** | `Trips` | Despacho de viagens, registro de hodômetro inicial/final e status |

### Níveis de Permissão (RBAC):
- `ADMIN`: Acesso total irrestrito ao sistema e gestão de operadores.
- `FLEET_MANAGER`: Acesso completo aos veículos, motoristas e viagens sob sua gestão.
- `DRIVER`: Visão self-service restrita às próprias viagens e perfil.

---

## 🚀 Execução Local & Docker

### Pré-requisitos
- **Node.js**: `v20.x` ou superior
- **Docker** e **Docker Compose**
- **npm** `v10.x` ou superior

### Opção 1: Via Docker Compose (Recomendado para ambiente completo)

```bash
# Sobe o banco de dados PostgreSQL e a API containerizada
docker compose up -d

# Visualizar logs da aplicação
docker compose logs -f api
```

### Opção 2: Desenvolvimento Local com Node.js

1. **Clone o repositório e instale as dependências:**
   ```bash
   git clone https://github.com/seu-usuario/rm-frotas.git
   cd rm-frotas
   npm install
   ```

2. **Configure o arquivo de ambiente:**
   ```bash
   cp .env.example .env
   ```
   *Certifique-se de ajustar `DATABASE_URL` e `JWT_SECRET`.*

3. **Inicie o banco PostgreSQL (se estiver rodando apenas o banco no Docker):**
   ```bash
   docker compose up -d postgres
   ```

4. **Execute as migrations do Prisma:**
   ```bash
   npx prisma migrate dev
   ```

5. **(Opcional) Popule o banco com dados de teste:**
   ```bash
   npm run seed
   ```

6. **Inicie a aplicação em modo desenvolvimento:**
   ```bash
   npm run start:dev
   ```

A API estará acessível em `http://localhost:3000/v1` e a documentação interativa em `http://localhost:3000/api`.

---

## 🧪 Testes & CI/CD

O projeto conta com uma pirâmide de testes completa para garantir alta confiabilidade:

```bash
# Executar todos os testes unitários (Vitest)
npm run test

# Executar testes unitários com relatório de cobertura
npm run test:cov

# Executar testes End-to-End (Supertest)
npm run test:e2e

# Executar a suíte completa de testes (Unit + E2E)
npm run test:all

# Executar linter ultra-rápido com Oxlint
npm run lint
```

### Integração Contínua (GitHub Actions)
Toda alteração disparada via Pull Request ou Push na branch `main`/`master` executa automaticamente a pipeline de CI:
- **Lint & Formatação**: Verificação estática via Oxlint.
- **Testes Unitários & E2E**: Execução completa das suítes de teste com relatórios de status.
- **Docker Build Validation**: Verificação de compilação da imagem Docker de produção.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja `LICENSE` para mais informações.