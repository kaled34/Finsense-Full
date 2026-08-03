# FinSense — Arquitectura del Sistema

## 1. Visión general

FinSense está construido siguiendo un enfoque de **Arquitectura Orientada a Servicios (SOA)**,
con tres capas claramente separadas que se comunican exclusivamente por contrato de API (REST + WebSockets):

```
┌───────────────────────┐        HTTPS / REST JSON        ┌───────────────────────┐
│   FRONTEND (cliente)  │  ───────────────────────────▶  │   BACKEND (servicios) │
│  Next.js 14 (App Router)│ ◀───────────────────────────  │   NestJS (TypeScript)  │
│  Desplegado en Vercel  │        WebSocket (Socket.IO)    │   Desplegado en Render │
└───────────────────────┘  ◀───────────────────────────▶  └───────────┬───────────┘
                                                                       │ Prisma ORM
                                                                       ▼
                                                           ┌───────────────────────┐
                                                           │   PostgreSQL (Render)  │
                                                           └───────────────────────┘
```

## 2. Capa de presentación — Frontend

- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind.
- **Estado:** Zustand (`store/authStore.ts`, `goalStore.ts`, `transactionStore.ts`, `uiStore.ts`).
- **Consumo de API:** Axios centralizado en `lib/apiClient.ts` (interceptores de refresh token) y
  un servicio dedicado por dominio en `services/` (auth, transactions, goals, budgets, analytics,
  groups, gamification, investments, notifications, subscriptions, calendar events, reportes, usuarios).
- **Autenticación en cliente:** `middleware.ts` valida expiración de JWT en Edge Runtime (sin verificar
  firma; la verificación de firma ocurre siempre en el backend).
- **Despliegue:** Vercel (`finsense-full-seven.vercel.app`).

## 3. Capa de servicios — Backend

- **Stack:** NestJS (TypeScript), arquitectura modular por dominio.
- **Módulos independientes:** `auth`, `transactions`, `goals`, `budgets`, `analytics`, `subscriptions`,
  `groups`, `notifications`, `gamification`, `investments`, `reports`, `calendar-events`, `challenges`, `chat`.
  Cada módulo encapsula su propio controller, service y (cuando aplica) DTOs — sin dependencias cruzadas
  directas entre dominios.
- **Contratos de entrada/salida:** validados globalmente con `ValidationPipe` (`whitelist`,
  `forbidNonWhitelisted`, `transform`) y DTOs con `class-validator`.
- **Tiempo real:** `groups.gateway.ts` expone eventos por Socket.IO (chat de grupo, notificaciones en vivo).
- **Autenticación:** Passport + JWT (access + refresh token), contraseñas con `bcrypt`.
- **Seguridad de cabeceras:** `helmet`.
- **Despliegue:** Render (`https://finsense-backend-ypwx.onrender.com/api`).

## 4. Capa de datos

- **Motor:** PostgreSQL.
- **ORM:** Prisma (`prisma/schema.prisma`, migraciones versionadas en `prisma/migration.sql`).
- **Seed:** `prisma/seed.ts` puebla categorías y benchmarks locales de Tuxtla Gutiérrez.

## 5. Variables de entorno esperadas

| Variable | Dónde | Propósito |
|---|---|---|
| `DATABASE_URL` | Backend (Render) | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Backend (Render) | Firma de tokens de acceso/refresco |
| `FRONTEND_URL` | Backend (Render) | Origen permitido para CORS |
| `PORT` | Backend (Render) | Puerto de escucha (lo asigna Render) |
| `NEXT_PUBLIC_API_URL` | Frontend (Vercel) | Base URL del backend consumida por el cliente |

## 6. Limitaciones conocidas / pendientes

- El CORS del backend (`main.ts`) actualmente usa `origin: true` en vez de restringir a
  `FRONTEND_URL`; queda pendiente ajustarlo para producción.
- Verificar que `NEXT_PUBLIC_API_URL` esté configurada en Vercel para evitar que el cliente
  apunte a `localhost` en producción.
- Frontend y backend residen en un monorepo (`Finsense-Full`), no en repositorios 100% independientes.

## 7. Pruebas

- **E2E:** Selenium (`tests/selenium/`) — flujo de login y flujo completo de usuario.
- **Carga:** JMeter (`tests/jmeter/`) — resultados en `results/aggregate_report.csv`.

## 8. Referencias

- Especificación de endpoints: [`API_SPEC.md`](./API_SPEC.md) y [`openapi.yaml`](./openapi.yaml)
- Declaración de uso de IA: [`AI_DECLARATION.md`](./AI_DECLARATION.md)
