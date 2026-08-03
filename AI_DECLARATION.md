#  Delaración de Uso de Inteligencia Artificial

## Herramientas de IA Utilizadas

| Herramienta | Proveedor | Tipo de uso |
|-------------|-----------|-------------|
| **GitHub Copilot** | Microsoft / OpenAI | Autocompletado de código en tiempo real (inline suggestions) |
| **ChatGPT (GPT-4o)** | OpenAI | Consultas puntuales de diseño, resolución de errores y revisión de patrones |
| **Google Gemini** | Google DeepMind | Revisión de documentación, generación de contenido estructurado (este archivo y el openapi.yaml) |

---

## Detalle del Uso por Módulo

### Backend — NestJS (`BackendFinsense-main/`)

| Archivo / Módulo | Contribución IA | Contribución Propia |
|-----------------|-----------------|---------------------|
| `src/main.ts` | Sugerencia del patrón de configuración CORS con variable de entorno | Decisión de usar `helmet()`, configuración del `GlobalPrefix`, ajuste de puerto |
| `src/auth/auth.service.ts` | Autocompletado de lógica bcrypt y generación de tokens JWT | Flujo de doble token (access + refresh), integración con Abstract Email API, inicialización de streak/XP |
| `src/auth/auth.dto.ts` | Sugerencia inicial de decoradores `class-validator` | Validación específica del dominio del proyecto |
| `src/transactions/transactions.service.ts` | Estructura base de `findAll` con paginación | Auto-categorización por keywords, lógica de streak, alertas de presupuesto, manejo de zonas horarias |
| `src/gamification/gamification.service.ts` | Estructura de logros y tablas de XP | Sistema de quests, mecánica de cofres, integración con trivia financiera, lógica de niveles |
| `src/analytics/analytics.service.ts` | Estructura de agregaciones Prisma | Algoritmo de detección de anomalías, cálculo de benchmarks por ciudad, predicciones de gasto |
| `prisma/schema.prisma` | Sugerencias de relaciones entre modelos | Diseño completo del modelo de datos del dominio |

### Frontend — Next.js (`Finsense-Frontend/`)

| Archivo / Módulo | Contribución IA | Contribución Propia |
|-----------------|-----------------|---------------------|
| `lib/apiClient.ts` | Patrón base de interceptores Axios con refresh token | Cola de reintentos (`failedQueue`), manejo de cookies vs localStorage |
| `middleware.ts` | Sugerencia de decodificación JWT sin librería en Edge Runtime | Lógica de expiración con buffer, limpieza de cookies al redirigir |
| `store/authStore.ts` | Estructura base de Zustand con `persist` | Campos específicos del dominio: `isPanicMode`, `preferences`, `updateUserStats` |
| `app/page.tsx` | Asistencia en estructura JSX de componentes UI | Diseño visual, gradientes, animaciones, contenido en español contextualizado |
| `services/*.ts` (16 servicios) | Generación de funciones de fetch básicas | Mapeo de respuestas, manejo de errores, integración con el store |
| `app/globals.css` | Sugerencias de variables CSS para el design system | Paleta de colores, animaciones personalizadas, modo oscuro/claro |

### Pruebas (`tests/`)

| Archivo | Contribución IA | Contribución Propia |
|---------|-----------------|---------------------|
| `selenium/test_full_user_flow.py` | Estructura base del patrón POM (Page Object Model) | Pasos de prueba, selectores CSS/XPath de FinSense, aserciones del flujo |
| `selenium/pages/*.py` | Sugerencia del patrón de clase POM | Implementación con selectores reales de la interfaz |
| `jmeter/Finsense_LoadTest.jmx` | Asistencia en assertions de tiempo de respuesta | Grupos de prueba, endpoints seleccionados, escenarios de carga |

---

## Lo que NO fue generado por IA

Los siguientes elementos fueron diseñados y desarrollados íntegramente sin asistencia de IA:

- **Concepto y dominio:** App de finanzas personales para estudiantes universitarios de Chiapas, con benchmarks locales de Tuxtla Gutiérrez.
- **Arquitectura del sistema:** Decisión de usar NestJS + Prisma + PostgreSQL + Next.js (App Router).
- **Modelo de datos Prisma:** El esquema completo fue diseñado desde cero para los requisitos del proyecto.
- **Sistema de gamificación:** Mecánica de streaks, XP, niveles, cofres y logros fue conceptualizada por el equipo.
- **Auto-categorización por keywords:** Algoritmo que asigna categorías automáticamente por descripción.
- **Benchmarks de Tuxtla Gutiérrez:** Datos de referencia para comparar gastos con promedios locales.
- **Pruebas de integración:** Escenarios de JMeter y flujos E2E Selenium diseñados y ejecutados por el equipo.
- **Despliegue:** Configuración en Vercel (frontend) y Render (backend) realizada manualmente.

---

## Justificación del Uso de IA

1. **Productividad:** GitHub Copilot aceleró la escritura de código repetitivo (DTOs, módulos NestJS, servicios CRUD básicos), permitiendo enfocarse en la lógica diferenciadora del proyecto.

2. **Aprendizaje asistido:** Se usó ChatGPT para entender el patrón de refresh token con colas de reintentos, que luego fue implementado y adaptado manualmente.

3. **Depuración:** En errores complejos, se consultó IA para identificar la causa raíz, pero la solución fue implementada y validada de forma independiente.

---

## Declaración de Integridad Académica

El equipo declara que:

- El código fuente fue **comprendido, revisado y adaptado** por los integrantes del equipo. No se copió código sin entenderlo.
- El uso de IA fue **una herramienta de apoyo**, no un sustituto del aprendizaje o el trabajo académico.
- Todos los resultados funcionales (endpoints activos en `https://finsense-full-seven.vercel.app`, pruebas ejecutadas con resultados CSV reales, despliegue en producción) son evidencia de trabajo real y funcional.
