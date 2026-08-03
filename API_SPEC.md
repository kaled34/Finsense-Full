# FinSense Especificacion de la API REST

Version: 1.0.0  
Framework: NestJS (TypeScript)  
Base URL Produccion: https://finsense-backend.onrender.com/api  
Base URL Local: http://localhost:3001/api  
Autenticacion: JWT Bearer Token  
Formato: JSON  

## Indice de Modulos

* Auth (/auth): 7 endpoints
* Transactions (/transactions): 4 endpoints
* Goals (/goals): 5 endpoints
* Budgets (/budgets): 5 endpoints
* Analytics (/analytics): 7 endpoints
* Subscriptions (/subscriptions): 4 endpoints
* Groups (/groups): 8 endpoints
* Notifications (/notifications): 5 endpoints
* Gamification (/gamification): 11 endpoints
* Investments (/investments): 6 endpoints
* Reports (/reports): 2 endpoints
* Calendar Events (/calendar-events): 3 endpoints

Total: 67 endpoints

## Autenticacion

Los endpoints protegidos requieren el siguiente header:
Authorization: Bearer <accessToken>

Los tokens se obtienen en POST /auth/login o POST /auth/register.  
El accessToken expira en 1 dia; renovar con POST /auth/refresh usando refreshToken.

## Auth

### POST /auth/register
Registrar usuario nuevo. Valida email con Abstract Email API.

Request Body:
```json
{
  "email": "maria@upchiapas.edu.mx",
  "password": "mipassword123",
  "name": "Maria Lopez",
  "city": "Tuxtla Gutierrez"
}
```

Respuesta 201:
```json
{
  "accessToken": "token_string",
  "refreshToken": "refresh_token_string",
  "user": {
    "id": "uuid-123",
    "email": "maria@upchiapas.edu.mx",
    "name": "Maria Lopez",
    "city": "Tuxtla Gutierrez",
    "createdAt": "2026-05-13T10:00:00Z"
  }
}
```

### POST /auth/login
Iniciar sesion.

Request Body:
```json
{
  "email": "maria@upchiapas.edu.mx",
  "password": "mipassword123"
}
```

Respuesta 200: Mismo formato que /auth/register

### POST /auth/refresh
Renovar access token.

Request Body:
```json
{
  "refreshToken": "token_string"
}
```

Respuesta 200:
```json
{
  "accessToken": "nuevo_token",
  "refreshToken": "nuevo_refresh_token"
}
```

### GET /auth/me
Perfil del usuario autenticado.

Respuesta 200:
```json
{
  "id": "uuid-123",
  "email": "maria@upchiapas.edu.mx",
  "name": "Maria Lopez",
  "city": "Tuxtla Gutierrez",
  "level": 3,
  "xp": 1240,
  "streakDays": 7,
  "coins": 85
}
```

### PATCH /auth/profile
Actualizar perfil.

Request Body:
```json
{
  "name": "Maria G. Lopez",
  "city": "San Cristobal",
  "avatar": "url_avatar"
}
```

### GET /auth/users
Listar todos los usuarios.

### GET /auth/users/search?q=pedro
Buscar usuarios por nombre o email.

## Transactions

### GET /transactions
Listar transacciones con paginacion y filtros.

Query params: type, category, startDate, endDate, groupId, q, page, limit.

Respuesta 200:
```json
{
  "data": [
    {
      "id": "tx-1",
      "amount": 150,
      "type": "expense",
      "description": "tacos en el centro",
      "date": "2026-07-15T12:00:00Z"
    }
  ],
  "total": 87,
  "page": 1,
  "limit": 50
}
```

### POST /transactions
Crear transaccion.

Request Body:
```json
{
  "amount": 150,
  "type": "expense",
  "description": "tacos en el centro",
  "date": "2026-07-15",
  "categoryId": "food"
}
```

Respuesta 201:
```json
{
  "id": "tx-new",
  "amount": 150,
  "type": "expense",
  "streakResult": {
    "currentStreak": 8,
    "totalXp": 1250,
    "level": 3
  }
}
```

### PUT /transactions/:id
Actualizar transaccion existente.

### DELETE /transactions/:id
Eliminar transaccion.

## Goals

### GET /goals
Listar metas de ahorro.

### POST /goals
Crear meta de ahorro.

Request Body:
```json
{
  "name": "Laptop nueva",
  "targetAmount": 15000,
  "deadline": "2026-12-31"
}
```

### PUT /goals/:id
Actualizar meta existente.

### DELETE /goals/:id
Eliminar meta.

### POST /goals/:id/deposit
Abonar a meta.

Request Body:
```json
{
  "amount": 500
}
```

Respuesta 201:
```json
{
  "goal": { "id": "goal-uuid", "currentAmount": 4000 },
  "completed": false,
  "xpGained": 20
}
```

## Budgets

### GET /budgets
Obtener presupuestos con gasto real del mes.

Respuesta 200:
```json
[
  {
    "id": "budget-uuid",
    "categoryName": "Alimentacion",
    "limit": 3000,
    "spent": 2800,
    "pct": 93.3,
    "status": "warning"
  }
]
```

### GET /budgets/categories
Listar categorias disponibles.

### POST /budgets
Crear o actualizar presupuesto.

Request Body:
```json
{
  "categoryId": "cat-uuid",
  "limitAmount": 3000,
  "month": "2026-08"
}
```

### PUT /budgets/:id
Actualizar limite de presupuesto.

### DELETE /budgets/:id
Eliminar presupuesto.

## Analytics

### GET /analytics/summary
Resumen financiero por periodo.

### GET /analytics/benchmarks
Comparacion con promedio de la ciudad.

### GET /analytics/monthly-comparison
Historico mensual de ingresos y gastos.

### GET /analytics/predictions
Proyeccion de gastos para el mes.

### GET /analytics/anomalies
Gastos inusuales o fuera de promedio.

### GET /analytics/heatmap
Frecuencia de transacciones por dia.

### GET /analytics/fugas
Deteccion de microgastos recurrentes.

## Subscriptions

### GET /subscriptions
Listar suscripciones activas y pausadas.

### POST /subscriptions
Crear nueva suscripcion.

Request Body:
```json
{
  "name": "Netflix",
  "cost": 219,
  "currency": "MXN",
  "billingCycle": "monthly",
  "nextBillingDate": "2026-09-01"
}
```

### PUT /subscriptions/:id
Actualizar datos o estado de suscripcion.

### DELETE /subscriptions/:id
Eliminar suscripcion.

## Groups

### GET /groups
Listar grupos del usuario.

### POST /groups
Crear grupo.

Request Body:
```json
{
  "name": "Departamentos",
  "memberIds": ["uuid-usuario-2"]
}
```

### GET /groups/:id
Detalle del grupo.

### POST /groups/:id/members
Agregar miembro al grupo.

### GET /groups/:id/expenses
Listar gastos compartidos.

### POST /groups/:id/expenses
Registrar gasto grupal.

Request Body:
```json
{
  "amount": 800,
  "description": "Supermercado",
  "splitBetween": ["uuid-1", "uuid-2"],
  "paidBy": "uuid-1"
}
```

### GET /groups/:id/balances
Balances de cuentas del grupo.

### GET /groups/:id/debts/simplified
Deudas simplificadas para saldo de cuentas.

### GET /groups/:id/messages
Historial de chat del grupo.

## Notifications

### GET /notifications
Listar notificaciones.

### POST /notifications/generate
Generar notificaciones automaticas.

### PATCH /notifications/read-all
Marcar todas las notificaciones como leidas.

### PATCH /notifications/:id/read
Marcar notificacion individual como leida.

### DELETE /notifications/:id
Eliminar notificacion.

## Gamification

### GET /gamification/profile
Perfil de juego, nivel y puntos.

### GET /gamification/users/:id/profile
Perfil publico de otro usuario.

### GET /gamification/quests
Misiones activas.

### GET /gamification/achievements
Logros del usuario.

### GET /gamification/leaderboard
Ranking de usuarios por XP.

### POST /gamification/purchase
Comprar item en la tienda.

### POST /gamification/daily-reward
Reclamar recompensa diaria.

### POST /gamification/equip-skin
Equipar skin de mascota.

### POST /gamification/open-chest
Abrir cofre de recompensas.

### POST /gamification/game-score
Guardar puntos de minijuego.

### GET /gamification/trivia-questions
Preguntas de trivia financiera.

### GET /gamification/budget-game-data
Datos de juego de presupuestos.

## Investments

### GET /investments
Portafolio de inversiones.

### POST /investments
Registrar inversion.

Request Body:
```json
{
  "name": "Apple Inc",
  "type": "stocks",
  "initialAmount": 5000,
  "currentValue": 5800,
  "purchaseDate": "2026-01-10"
}
```

### GET /investments/search?q=AAPL
Buscar ticker.

### POST /investments/sync
Sincronizar precios de mercado.

### PUT /investments/:id
Actualizar valor de inversion.

### DELETE /investments/:id
Eliminar inversion.

## Reports

### GET /reports/csv
Descargar reporte de transacciones en CSV.

### GET /reports/summary
Resumen de transacciones por fechas.

## Calendar Events

### GET /calendar-events
Listar eventos guardados.

### POST /calendar-events
Crear evento financiero.

### DELETE /calendar-events/:id
Eliminar evento.

## Codigos de Respuesta HTTP

200: Operacion exitosa  
201: Recurso creado  
400: Datos invalidos  
401: No autorizado  
404: Recurso no encontrado  
409: Conflicto o dato duplicado  
500: Error interno del servidor  

Fecha de generacion: 03/08/2026
