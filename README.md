# RM Frotas

Sistema de gestão de frotas (*fleet management*) desenvolvido como projeto de estudos, aplicando **Domain-Driven Design (DDD) tático** e **Clean Architecture** em NestJS.

O objetivo do projeto não é apenas entregar funcionalidades, mas praticar organização de código em camadas, separação de responsabilidades e boas práticas de backend usadas em times sêniores.

## Stack tecnológica

- **[NestJS](https://nestjs.com/)** — framework Node.js/TypeScript
- **[Prisma](https://www.prisma.io/)** — ORM
- **PostgreSQL** — banco de dados relacional
- **[Vitest](https://vitest.dev/)** — testes unitários
- **[Supertest](https://github.com/ladjs/supertest)** — testes end-to-end (com repositório *in-memory* nos testes e2e)
- **GitHub Actions** — CI (jobs separados de lint e testes)
- **Docker** — containerização (em andamento)

## Arquitetura

Cada módulo de domínio segue a mesma estrutura em camadas:

```
src/
└── <módulo>/
    ├── domain/          # entidades, value objects, exceções de domínio
    ├── application/     # use cases
    └── infrastructure/  # controllers, repositórios Prisma
```

Não há multi-tenant completo (sem conceito de empresa/billing). Cada `Vehicle` e `Driver` possui um campo `ownerId`, ligado ao usuário gestor que os cadastrou — cada gestor enxerga apenas o que é seu.

`User` (autenticação) é modelado separado de `Driver` (motorista de negócio): um motorista pode ter um `userId` opcional apenas se também tiver login próprio no sistema.

## Módulos implementados

| Módulo | Descrição |
|---|---|
| **Vehicles** | Cadastro e gestão de veículos da frota |
| **Drivers** | Cadastro de motoristas |
| **Trips** | Registro de viagens |
| **Auth** | Autenticação e autorização por *roles*: `ADMIN`, `FLEET_MANAGER`, `DRIVER` |

O motorista (`DRIVER`) tem login próprio no mesmo sistema web, com visão restrita/self-service (próprias viagens, abastecimento, alertas de CNH vencida) — em vez de um app separado.

## Próximos passos

- [ ] Módulo de **Fuel** (abastecimento)
- [ ] Dockerização (`Dockerfile` + `docker-compose.yml`)
- [ ] Deploy na [Render](https://render.com/)

## Como rodar localmente

```bash
# instalar dependências
npm install

# configurar variáveis de ambiente
cp .env.example .env

# rodar migrations do Prisma
npx prisma migrate dev

# subir em modo desenvolvimento
npm run start:dev
```

## Testes

```bash
# testes unitários
npm run test

# testes end-to-end
npm run test:e2e

# cobertura de testes
npm run test:cov
```

## Licença

Este projeto é distribuído sob a licença MIT.