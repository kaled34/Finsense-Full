# FinSense Backend — NestJS API

> Universidad Politécnica de Chiapas · Proyecto Integrador II · 2026

## Stack
- **NestJS** (TypeScript, SOA modular)
- **PostgreSQL** + **Prisma ORM**
- **JWT** (access + refresh tokens)
- Puerto: `3001`

---

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu contraseña de PostgreSQL

# 3. Crear la base de datos en pgAdmin: "finsense"

# 4. Ejecutar migraciones
npx prisma migrate dev --name init

# 5. Poblar datos iniciales (categorías + benchmarks de Tuxtla)
npm run seed

# 6. Iniciar en desarrollo
npm run start:dev
```

---

## Endpoints de la API

Base URL: `http://localhost:3001/api`

###  Auth — `/auth`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Crear cuenta | ❌ |
| POST | `/auth/login` | Iniciar sesión → tokens | ❌ |
| POST | `/auth/refresh` | Renovar access token | ❌ |
| GET | `/auth/me` | Perfil + streak + XP | ✅ |

**Ejemplo registro:**
```json
POST /api/auth/register
{
  "email": "maria@upchiapas.edu.mx",
  "password": "mipassword123",
  "name": "María López",
  "city": "Tuxtla Gutiérrez"
}
```

**Respuesta:**
```json
{ "accessToken": "...", "refreshToken": "..." }
```

---

###  Transactions — `/transactions`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/transactions` | Listar (filtros opcionales) | ✅ |
| POST | `/transactions` | Crear gasto/ingreso | ✅ |
| PUT | `/transactions/:id` | Editar | ✅ |
| DELETE | `/transactions/:id` | Eliminar | ✅ |

**Query params GET:** `type`, `category`, `startDate`, `endDate`, `groupId`, `page`, `limit`

**Ejemplo crear gasto:**
```json
POST /api/transactions
Authorization: Bearer <token>
{
  "amount": 150,
  "type": "expense",
  "description": "tacos en el centro",
  "date": "2026-05-23"
}
```
> La categoría se asigna automáticamente por keywords ("tacos" → Alimentación)

---

###  Goals — `/goals`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/goals` | Listar metas | ✅ |
| POST | `/goals` | Crear meta | ✅ |
| PUT | `/goals/:id` | Editar meta | ✅ |
| DELETE | `/goals/:id` | Eliminar | ✅ |
| POST | `/goals/:id/deposit` | Abonar a meta (+XP) | ✅ |

**Abonar:**
```json
POST /api/goals/uuid-aqui/deposit
{ "amount": 500 }
```
**Respuesta:** `{ goal, completed, xpGained }`

---

###  Analytics — `/analytics`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/analytics/summary` | Resumen mensual | ✅ |
| GET | `/analytics/benchmark` | Comparación vs Tuxtla | ✅ |

**Query params:**
- `summary?month=2026-05`
- `benchmark?category=Alimentación&month=2026-05`

**Respuesta benchmark:**
```json
{
  "category": "Alimentación",
  "city": "Tuxtla Gutiérrez",
  "userAmount": 2800,
  "benchmark": { "avgAmount": 3200, "percentile25": 1800, "percentile75": 4500 },
  "percentile": "promedio_bajo"
}
```

---

###  Groups — `/groups`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/groups` | Mis grupos | ✅ |
| POST | `/groups` | Crear grupo | ✅ |
| POST | `/groups/:id/members` | Agregar miembro | ✅ |
| POST | `/groups/:id/expenses` | Registrar gasto grupal | ✅ |
| GET | `/groups/:id/balances` | Balances (quién debe) | ✅ |

---

###  Notifications — `/notifications`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/notifications` | Feed de alertas | ✅ |
| PATCH | `/notifications/:id/read` | Marcar leída | ✅ |
| PATCH | `/notifications/read-all` | Marcar todas leídas | ✅ |

---

## Gamificación

| Acción | XP |
|--------|-----|
| Registrar gasto (racha +1 día) | +10 XP |
| Abonar a meta | +20 XP |
| Completar meta | +100 XP |
| Nivel | cada 500 XP |

---

## Estructura

```
src/
├── auth/           # JWT register/login/refresh
├── transactions/   # CRUD + auto-categorización + streak
├── goals/          # Metas + depósitos + XP
├── analytics/      # Resumen + benchmarks Tuxtla
├── groups/         # Grupos + balances automáticos
├── notifications/  # Feed in-app
└── prisma/         # PrismaService (global)
```
