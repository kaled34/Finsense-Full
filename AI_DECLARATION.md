# Declaracion de Uso de Inteligencia Artificial

## Proposito de este Documento

Se ha creado para declarar el uso de la inteligencia artificial  durante el desarrolo del proyecto integrador de finsense, indicando el alcance en cuanto a su utilización y las herramientas utilizadas, tanto para el backend como para el frontend, asi como para las pruebas. Tambien se incluye una breve descripcion de los modulos desarrollados y los que fueron generados o asistidos por IA.
## Herramientas de IA Utilizadas

| Herramienta | Proveedor | Tipo de uso |
|---|---|---|
| GitHub Copilot | Microsoft / OpenAI | Autocompletado de codigo en tiempo real |
| ChatGPT (GPT-4o) | OpenAI | Consultas de diseno y resolucion de errores |
| Google Gemini | Google DeepMind | Revision de documentacion y generacion de archivos |

## Detalle del Uso por Modulo

### Backend - NestJS (BackendFinsense-main/)

| Archivo / Modulo | Contribucion IA | Contribucion Propia |
|---|---|---|
| src/main.ts | Sugerencia de configuracion CORS | Uso de helmet, GlobalPrefix y puerto |
| src/auth/auth.service.ts | Autocompletado de bcrypt y JWT | Flujo de doble token e integracion con Abstract Email API |
| src/auth/auth.dto.ts | Decoradores iniciales de class-validator | Validaciones especificas del dominio |
| src/transactions/transactions.service.ts | Paginacion en findAll | Auto-categorizacion por keywords y alertas |
| src/gamification/gamification.service.ts | Estructura de logros | Quests, cofres y trivia financiera |
| src/analytics/analytics.service.ts | Agregaciones de Prisma | Anomalias, benchmarks y predicciones |
| prisma/schema.prisma | Relaciones entre modelos | Diseno completo del modelo de datos |

### Frontend - Next.js (Finsense-Frontend/)

| Archivo / Modulo | Contribucion IA | Contribucion Propia |
|---|---|---|
| lib/apiClient.ts | Interceptores Axios con refresh token | Cola de reintentos y manejo de cookies |
| middleware.ts | Decodificacion JWT en Edge Runtime | Logica de expiracion y redireccion |
| store/authStore.ts | Estructura base de Zustand con persist | Estado global de preferencias y usuario |
| app/page.tsx | Estructura JSX basica | Diseno visual, animaciones y contenido |
| services/*.ts | Funciones de fetch basicas | Mapeo de respuestas y manejo de errores |
| app/globals.css | Variables CSS iniciales | Paleta de colores y estilos globales |

### Pruebas (tests/)

| Archivo | Contribucion IA | Contribucion Propia |
|---|---|---|
| selenium/test_full_user_flow.py | Estructura base POM | Pasos de prueba y aserciones |
| jmeter/Finsense_LoadTest.jmx | Assertions de tiempo de respuesta | Escenarios de carga y endpoints |

## Lo que NO fue generado por IA

Los siguientes elementos fueron desarrollados integramente por el equipo:

* Concepto y dominio de la aplicacion enfocado en estudiantes de Chiapas.
* Arquitectura del sistema en NestJS, Prisma, PostgreSQL y Next.js.
* Modelo de datos completo en Prisma.
* Sistema de gamificacion (streaks, XP, niveles y logros).
* Algoritmo de auto-categorizacion por palabras clave.
* Datos de benchmarks locales de Tuxtla Gutierrez.
* Pruebas de integracion con JMeter y Selenium.
* Configuracion de despliegue en Vercel y Render.

## Justificacion del Uso de IA

1. Productividad: Aceleracion de escritura de codigo repetitivo.
2. Aprendizaje asistido: Comprension de patrones como refresh token.
3. Depuracion: Identificacion de causas raiz en errores de compilacion y entorno.
4. Documentacion: Estructuracion de archivos de documentacion y especificaciones.


