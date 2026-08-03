# 📡 FinSense — Especificación de la API REST

> **Versión:** 1.0.0  
> **Framework:** NestJS (TypeScript)  
> **Base URL Producción:** `https://finsense-backend.onrender.com/api`  
> **Base URL Local:** `http://localhost:3001/api`  
> **Autenticación:** JWT Bearer Token  
> **Formato:** JSON (todas las respuestas)

---

## Índice de Módulos

| Módulo | Prefijo | Endpoints | Auth requerida |
|--------|---------|-----------|----------------|
| [Auth](#auth) | `/auth` | 7 | Mixta |
| [Transactions](#transactions) | `/transactions` | 4 | ✅ Todas |
| [Goals](#goals) | `/goals` | 5 | ✅ Todas |
| [Budgets](#budgets) | `/budgets` | 5 | ✅ Todas |
| [Analytics](#analytics) | `/analytics` | 7 | ✅ Todas |
| [Subscriptions](#subscriptions) | `/subscriptions` | 4 | ✅ Todas |
| [Groups](#groups) | `/groups` | 8 | ✅ Todas |
| [Notifications](#notifications) | `/notifications` | 5 | ✅ Todas |
| [Gamification](#gamification) | `/gamification` | 11 | ✅ Todas |
| [Investments](#investments) | `/investments` | 6 | ✅ Todas |
| [Reports](#reports) | `/reports` | 2 | ✅ Todas |
| [Calendar Events](#calendar-events) | `/calendar-events` | 3 | ✅ Todas |

**Total: 67 endpoints**

---

## Autenticación

Todos los endpoints marcados con 🔒 requieren el header:

```
Authorization: Bearer <accessToken>
```

Los tokens se obtienen en `POST /auth/login` o `POST /auth/register`.  
El `accessToken` expira en **1 día**; renovar con `POST /auth/refresh` usando el `refreshToken` (válido 7 días).

---

## Auth

### `POST /auth/register` — Registrar usuario
Crea cuenta nueva. Valida email con Abstract Email API. Inicializa streak y XP.

**Request Body:**
```json
{
  "email": "maria@upchiapas.edu.mx",   // requerido, debe ser email válido
  "password": "mipassword123",          // requerido, mínimo 6 caracteres
  "name": "María López",               // requerido
  "city": "Tuxtla Gutiérrez"           // opcional
}
```

**Respuesta 201:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "uuid-123",
    "email": "maria@upchiapas.edu.mx",
    "name": "María López",
    "city": "Tuxtla Gutiérrez",
    "createdAt": "2026-05-13T10:00:00Z"
  }
}
```

| Código | Descripción |
|--------|-------------|
| 201 | Usuario creado y tokens generados |
| 400 | Email no existe o no puede recibir mensajes |
| 409 | Email ya registrado |

---

### `POST /auth/login` — Iniciar sesión

**Request Body:**
```json
{
  "email": "maria@upchiapas.edu.mx",
  "password": "mipassword123"
}
```

**Respuesta 200:** Mismo formato que `/auth/register`

| Código | Descripción |
|--------|-------------|
| 200 | Login exitoso |
| 401 | Credenciales inválidas |

---

### `POST /auth/refresh` — Renovar access token

**Request Body:**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Respuesta 200:**
```json
{
  "accessToken": "eyJhbGci...(nuevo)",
  "refreshToken": "eyJhbGci...(nuevo)"
}
```

---

### `GET /auth/me` 🔒 — Perfil del usuario autenticado

Retorna datos completos del usuario: perfil, streak, XP, nivel, metas completadas.

**Respuesta 200:**
```json
{
  "id": "uuid-123",
  "email": "maria@upchiapas.edu.mx",
  "name": "María López",
  "city": "Tuxtla Gutiérrez",
  "avatar": null,
  "level": 3,
  "xp": 1240,
  "xpToNextLevel": 1500,
  "streakDays": 7,
  "maxStreak": 14,
  "coins": 85,
  "monthsActive": 3,
  "goalsCompleted": 2,
  "registeredToday": true,
  "lastEntryDate": "2026-08-03T18:00:00Z"
}
```

---

### `PATCH /auth/profile` 🔒 — Actualizar perfil

**Request Body (todos opcionales):**
```json
{
  "name": "María G. López",
  "city": "San Cristóbal",
  "avatar": "https://cdn.ejemplo.com/avatar.jpg"
}
```

**Respuesta 200:** Perfil actualizado

---

### `GET /auth/users` 🔒 — Listar todos los usuarios

**Respuesta 200:**
```json
[
  {
    "id": "uuid-456",
    "name": "Pedro García",
    "email": "pedro@upchiapas.edu.mx",
    "avatar": null,
    "isFriend": true,
    "userXp": { "level": 2, "totalXp": 800 }
  }
]
```

---

### `GET /auth/users/search?q=pedro` 🔒 — Buscar usuarios

**Query params:** `q` (string, requerido)  
**Respuesta 200:** Array de usuarios que coinciden con la búsqueda

---

## Transactions

### `GET /transactions` 🔒 — Listar transacciones

**Query params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `type` | `income` \| `expense` | Filtrar por tipo |
| `category` | string | Nombre de categoría |
| `startDate` | date (YYYY-MM-DD) | Fecha inicial |
| `endDate` | date (YYYY-MM-DD) | Fecha final |
| `groupId` | UUID | Filtrar por grupo |
| `q` | string | Búsqueda en descripción y categoría |
| `page` | integer | Página (default: 1) |
| `limit` | integer | Por página (default: 50) |

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "tx-uuid-1",
      "amount": 150,
      "type": "expense",
      "description": "tacos en el centro",
      "date": "2026-07-15T12:00:00Z",
      "category": { "id": "cat-uuid", "name": "Alimentación", "icon": "🍔", "color": "#FF6B6B" }
    }
  ],
  "total": 87,
  "page": 1,
  "limit": 50
}
```

---

### `POST /transactions` 🔒 — Crear transacción

La categoría se resuelve automáticamente en orden de prioridad:  
`categoryId (UUID)` → `categoryId (slug)` → `categoryName` → `keywords de description`

**Slugs válidos:** `food`, `transport`, `university`, `entertainment`, `services`, `health`, `clothing`, `savings`, `salary`, `allowance`, `scholarship`, `freelance`, `gift`, `other`

**Request Body:**
```json
{
  "amount": 150,
  "type": "expense",
  "description": "tacos en el centro",
  "date": "2026-07-15",
  "categoryId": "food"
}
```

**Respuesta 201:**
```json
{
  "id": "tx-uuid-new",
  "amount": 150,
  "type": "expense",
  "category": { "name": "Alimentación" },
  "streakResult": {
    "currentStreak": 8,
    "longestStreak": 14,
    "xpAwarded": 10,
    "totalXp": 1250,
    "level": 3
  }
}
```

| Código | Descripción |
|--------|-------------|
| 201 | Transacción creada |
| 400 | Fecha inválida o validación fallida |
| 401 | No autorizado |

---

### `PUT /transactions/:id` 🔒 — Actualizar transacción

**Request Body (todos opcionales):**
```json
{
  "amount": 200,
  "type": "expense",
  "categoryId": "food",
  "description": "cena en restaurante",
  "date": "2026-07-16"
}
```

**Respuesta 200:** Transacción actualizada  
**404:** Transacción no encontrada o no pertenece al usuario

---

### `DELETE /transactions/:id` 🔒 — Eliminar transacción

**Respuesta 200:** Transacción eliminada  
**404:** No encontrada

---

## Goals

### `GET /goals` 🔒 — Listar metas

**Respuesta 200:**
```json
[
  {
    "id": "goal-uuid",
    "name": "Laptop nueva",
    "targetAmount": 15000,
    "currentAmount": 3500,
    "status": "active",
    "deadline": "2026-12-31",
    "icon": "💻",
    "color": "#6C63FF"
  }
]
```

---

### `POST /goals` 🔒 — Crear meta

**Request Body:**
```json
{
  "name": "Laptop nueva",
  "targetAmount": 15000,
  "deadline": "2026-12-31",
  "icon": "💻",
  "color": "#6C63FF"
}
```

**Respuesta 201:** Meta creada

---

### `PUT /goals/:id` 🔒 — Actualizar meta

Mismo body que crear, todos los campos opcionales.

---

### `DELETE /goals/:id` 🔒 — Eliminar meta

**Respuesta 200:** Meta eliminada

---

### `POST /goals/:id/deposit` 🔒 — Abonar a meta

**Request Body:**
```json
{ "amount": 500 }
```

**Respuesta 201:**
```json
{
  "goal": { "id": "goal-uuid", "currentAmount": 4000, "status": "active" },
  "completed": false,
  "xpGained": 20
}
```

> Cuando `completed: true`, se otorgan **100 XP** adicionales.

---

## Budgets

### `GET /budgets` 🔒 — Obtener presupuestos con gasto real

**Query params:** `month` (YYYY-MM, default: mes actual)

**Respuesta 200:**
```json
[
  {
    "id": "budget-uuid",
    "categoryName": "Alimentación",
    "categoryIcon": "🍔",
    "categoryColor": "#FF6B6B",
    "limit": 3000,
    "spent": 2800,
    "pct": 93.3,
    "status": "warning",
    "month": "2026-08"
  }
]
```

**Status posibles:** `healthy` (< 80%), `warning` (80-99%), `exceeded` (≥ 100%)

---

### `GET /budgets/categories` 🔒 — Listar categorías disponibles

**Respuesta 200:** Array de categorías con id, nombre, ícono y color

---

### `POST /budgets` 🔒 — Crear/actualizar presupuesto

Realiza un **upsert** por (categoryId + month).

**Request Body:**
```json
{
  "categoryId": "cat-uuid",
  "limitAmount": 3000,
  "month": "2026-08"
}
```

---

### `PUT /budgets/:id` 🔒 — Actualizar límite

**Request Body:** `{ "limitAmount": 3500 }`

---

### `DELETE /budgets/:id` 🔒 — Eliminar presupuesto

---

## Analytics

### `GET /analytics/summary` 🔒 — Resumen financiero

**Query:** `period` (ej. `2026-07`, `month`, `week`, `year`)

**Respuesta 200:** Totales de ingresos/gastos, distribución por categoría, balance neto.

---

### `GET /analytics/benchmarks` 🔒 — Comparación con ciudad

**Query:** `city` (default: ciudad del perfil)

**Respuesta 200:**
```json
{
  "category": "Alimentación",
  "city": "Tuxtla Gutiérrez",
  "userAmount": 2800,
  "benchmark": {
    "avgAmount": 3200,
    "percentile25": 1800,
    "percentile75": 4500
  },
  "percentile": "promedio_bajo"
}
```

---

### `GET /analytics/monthly-comparison` 🔒 — Comparación mensual

**Query:** `months` (integer, default: 6)  
**Respuesta:** Serie temporal de ingresos y gastos

---

### `GET /analytics/predictions` 🔒 — Predicciones de gasto

Proyecta el gasto del mes actual basándose en el historial.

---

### `GET /analytics/anomalies` 🔒 — Gastos anómalos

Detecta transacciones con desviación estadística significativa respecto al promedio.

---

### `GET /analytics/heatmap` 🔒 — Mapa de calor de actividad

Datos de actividad financiera por día para visualización tipo GitHub heatmap.

---

### `GET /analytics/fugas` 🔒 — Micro-gastos / fugas

**Query:** `limit` (número, default: 200 — monto máximo para considerar micro-gasto)

---

## Subscriptions

### `GET /subscriptions` 🔒 | `POST /subscriptions` 🔒

**Request Body (POST):**
```json
{
  "name": "Netflix",
  "cost": 219,
  "currency": "MXN",
  "billingCycle": "monthly",
  "nextBillingDate": "2026-09-01",
  "category": "Entretenimiento"
}
```

### `PUT /subscriptions/:id` 🔒 | `DELETE /subscriptions/:id` 🔒

**Actualizar:** incluye campo `status` (`active`, `paused`, `cancelled`)

---

## Groups

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/groups` | Listar grupos del usuario |
| POST | `/groups` | Crear grupo |
| GET | `/groups/:id` | Detalle del grupo con miembros |
| POST | `/groups/:id/members` | Agregar miembro |
| POST | `/groups/:id/invites` | Invitar miembro |
| GET | `/groups/:id/expenses` | Gastos del grupo |
| POST | `/groups/:id/expenses` | Registrar gasto grupal |
| GET | `/groups/:id/balances` | Balances (quién debe) |
| GET | `/groups/:id/debts/simplified` | Deudas simplificadas |
| GET | `/groups/:id/messages` | Chat del grupo |

**Body crear grupo:**
```json
{
  "name": "Compañeros de depa",
  "memberIds": ["uuid-pedro", "uuid-ana"]
}
```

**Body gasto grupal:**
```json
{
  "amount": 800,
  "description": "Pizza del viernes",
  "splitBetween": ["uuid-kaled", "uuid-pedro", "uuid-ana"],
  "paidBy": "uuid-kaled"
}
```

---

## Notifications

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/notifications` | Feed de notificaciones |
| POST | `/notifications/generate` | Generar notificación inteligente |
| PATCH | `/notifications/read-all` | Marcar todas como leídas |
| PATCH | `/notifications/:id/read` | Marcar una como leída |
| DELETE | `/notifications/:id` | Eliminar notificación |

**Tipos de notificación:** `budget_exceeded`, `budget_warning`, `goal_completed`, `streak_milestone`, `subscription_due`

---

## Gamification

| Método | Endpoint | Descripción | XP/Recompensa |
|--------|----------|-------------|---------------|
| GET | `/gamification/profile` | Perfil completo XP/nivel/logros | — |
| GET | `/gamification/users/:id/profile` | Perfil público (sin auth) | — |
| GET | `/gamification/quests` | Misiones activas | — |
| GET | `/gamification/achievements` | Logros | — |
| GET | `/gamification/leaderboard` | Ranking por XP | — |
| POST | `/gamification/purchase` | Comprar en tienda | Costo en monedas |
| POST | `/gamification/daily-reward` | Recompensa diaria | +25 XP / +10 coins |
| POST | `/gamification/equip-skin` | Equipar skin | — |
| POST | `/gamification/open-chest` | Abrir cofre aleatorio | Variable |
| POST | `/gamification/game-score` | Puntuación de minijuego | XP variable |
| GET | `/gamification/trivia-questions` | Preguntas de trivia | — |
| GET | `/gamification/budget-game-data` | Datos para juego de presupuesto | — |

---

## Investments

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/investments` | Portafolio de inversiones |
| POST | `/investments` | Registrar inversión |
| GET | `/investments/search?q=AAPL` | Buscar ticker |
| POST | `/investments/sync` | Sincronizar precios |
| PUT | `/investments/:id` | Actualizar inversión |
| DELETE | `/investments/:id` | Eliminar inversión |

---

## Reports

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/reports/csv` | Exportar CSV con BOM UTF-8 (para Excel) |
| GET | `/reports/summary` | Resumen de transacciones por período |

**Query params comunes:** `period`, `startDate`, `endDate`

---

## Calendar Events

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/calendar-events` | Listar eventos del calendario |
| POST | `/calendar-events` | Crear evento |
| DELETE | `/calendar-events/:id` | Eliminar evento |

---

## Códigos de Respuesta HTTP Globales

| Código | Significado |
|--------|-------------|
| 200 | OK — Operación exitosa |
| 201 | Created — Recurso creado |
| 400 | Bad Request — Validación fallida |
| 401 | Unauthorized — Token inválido/expirado |
| 403 | Forbidden — Sin permisos para ese recurso |
| 404 | Not Found — Recurso no encontrado |
| 409 | Conflict — Duplicado (e.g., email ya registrado) |
| 500 | Internal Server Error — Error del servidor |

**Formato de error:**
```json
{
  "statusCode": 404,
  "message": "Transaction not found",
  "error": "Not Found"
}
```

---

## Sistema de XP y Gamificación

| Acción | XP Ganado |
|--------|-----------|
| Registrar transacción (racha +1 día) | +10 XP |
| Abonar a meta | +20 XP |
| Completar meta | +100 XP |
| Recompensa diaria | +25 XP |
| Minijuegos | Variable |
| **Subir de nivel** | Cada 500 XP acumulados |

---

*Documento generado: 03/08/2026 — Derivado directamente del código fuente del proyecto FinSense*
