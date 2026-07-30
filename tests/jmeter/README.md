# Pruebas de Carga con JMeter - Finsense API

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `Finsense_LoadTest.jmx` | Plan de pruebas principal |
| `run_jmeter.ps1` | Script de ejecución PowerShell |
| `test_users.csv` | Datos de prueba (usuarios) |
| `results/` | Carpeta de resultados (auto-creada) |

---

## Estructura del Plan de Pruebas (JMX)

### Grupo 1: Setup *(1 hilo, 1 iteración)*
- Registra el usuario de prueba (ignora 409 si ya existe)

### Grupo 2: Carga *(10 hilos, 3 iteraciones, ramp-up 10s)*
Flujo completo de usuario con **assertions** de código HTTP y tiempo:

| # | Request | Tiempo Máx |
|---|---------|-----------|
| 1 | `POST /api/auth/login` | 2000 ms |
| 2 | `GET /api/auth/me` | 1500 ms |
| 3 | `GET /api/transactions` | 3000 ms |
| 4 | `POST /api/transactions` | 2000 ms |
| 5 | `GET /api/budgets` | 2000 ms |
| 6 | `GET /api/goals` | 2000 ms |
| 7 | `GET /api/analytics/summary` | 3000 ms |

### Grupo 3: Stress *(50 hilos, 5 iter., deshabilitado)*
- Se habilita manualmente para pruebas de estrés en auth

---

## Cómo ejecutar

### Opción A: Interfaz Gráfica (recomendado para depuración)
```powershell
.\run_jmeter.ps1 -mode gui
```

### Opción B: Línea de comandos (carga normal)
```powershell
.\run_jmeter.ps1 -mode load
```

### Opción C: Stress test (50 usuarios)
1. Abre el JMX en JMeter GUI
2. Habilita el Thread Group "Stress Test"
3. Ejecuta:
```powershell
.\run_jmeter.ps1 -mode stress
```

### Especificar host/puerto personalizado
```powershell
.\run_jmeter.ps1 -mode load -host_url "192.168.1.10" -port "3001"
```

---

## Prerequisitos

1. **JMeter 5.6.3** descargado y descomprimido en `C:\apache-jmeter-5.6.3`
   - Descarga: https://jmeter.apache.org/download_jmeter.cgi
2. **Backend Finsense** corriendo en `http://localhost:3001`
3. El usuario `usuario@prueba.com` con password `password123` debe poder registrarse

> **Nota:** Si JMeter está en otra ruta:
> ```powershell
> .\run_jmeter.ps1 -jmeter_home "D:\tools\apache-jmeter-5.6.3"
> ```

---

## Resultados

Los reportes se guardan en `results/`:
- `results/load_summary.csv` — resumen de la prueba de carga
- `results/aggregate_report.csv` — reporte agregado con percentiles
- `results/stress_report.csv` — reporte del stress test
- `results/html_report/<timestamp>/index.html` — **reporte HTML interactivo**

---

## Interpretar resultados clave

| Métrica | Qué significa | Umbral recomendado |
|---------|--------------|-------------------|
| **Throughput** | Requests por segundo | > 50 rps para carga normal |
| **Avg Response Time** | Tiempo promedio | < 500ms (idealmente) |
| **90th Percentile** | El 90% de requests < X ms | < 2000ms |
| **Error %** | % de requests fallidos | < 1% |

---

## Verificación previa a las pruebas

Asegúrate de que el backend responde:
```powershell
# Verificar que el backend está activo
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"usuario@prueba.com","password":"password123"}'
```
