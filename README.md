# NestJS Base Project

Base backend project for API + worker mode using:

- NestJS 11
- TypeORM + PostgreSQL
- BullMQ + Redis
- Throttler (Redis storage)
- Joi environment validation

## 1) Setup

```bash
cp .env.example .env
npm install
```

## 2) Run API

```bash
npm run start:dev
```

- Health check: `GET /api/v1/health`
- Swagger: `/api/docs`

## 3) Run Worker

```bash
npm run start:worker:dev
```

## 4) Build

```bash
npm run build
```

## 5) Migrations

```bash
npm run migration:generate --name=Init
npm run migration:run
npm run migration:revert
```
