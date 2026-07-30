# Script PowerShell para ejecutar pruebas JMeter con Finsense
# Uso: .\run_jmeter.ps1 [-mode load|stress|headless] [-host localhost] [-port 3001]

param(
    [string]$mode = "load",
    [string]$host_url = "localhost",
    [string]$port = "3001",
    [string]$jmeter_home = "C:\apache-jmeter-5.6.3"
)

$JMX_FILE = "$PSScriptRoot\Finsense_LoadTest.jmx"
$RESULTS_DIR = "$PSScriptRoot\results"
$REPORT_DIR = "$PSScriptRoot\results\html_report"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$RESULTS_FILE = "$RESULTS_DIR\results_$TIMESTAMP.jtl"

# Crear directorio de resultados si no existe
if (-not (Test-Path $RESULTS_DIR)) {
    New-Item -ItemType Directory -Path $RESULTS_DIR | Out-Null
    Write-Host "[OK] Directorio results/ creado" -ForegroundColor Green
}

# Verificar que JMeter existe
$JMETER_BIN = "$jmeter_home\bin\jmeter.bat"
if (-not (Test-Path $JMETER_BIN)) {
    Write-Host "[ERROR] JMeter no encontrado en: $jmeter_home" -ForegroundColor Red
    Write-Host "        Descarga JMeter desde: https://jmeter.apache.org/download_jmeter.cgi" -ForegroundColor Yellow
    Write-Host "        O especifica la ruta: .\run_jmeter.ps1 -jmeter_home 'C:\ruta\a\jmeter'" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "   Finsense JMeter Test Runner" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Modo:       $mode" -ForegroundColor White
Write-Host "  Host:       $host_url`:$port" -ForegroundColor White
Write-Host "  JMX:        $JMX_FILE" -ForegroundColor White
Write-Host "  Resultados: $RESULTS_FILE" -ForegroundColor White
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Ejecutar segun modo
switch ($mode) {
    "load" {
        Write-Host "[*] Ejecutando prueba de CARGA (10 usuarios, 3 iteraciones)..." -ForegroundColor Yellow
        & "$JMETER_BIN" -n `
            -t "$JMX_FILE" `
            -l "$RESULTS_FILE" `
            -Jhost=$host_url `
            -Jport=$port `
            -e -o "$REPORT_DIR\$TIMESTAMP"
    }
    "stress" {
        Write-Host "[*] Ejecutando prueba de STRESS (50 usuarios, 5 iteraciones)..." -ForegroundColor Red
        Write-Host "[!] Asegurate de habilitar el Thread Group de Stress en el JMX" -ForegroundColor Yellow
        & "$JMETER_BIN" -n `
            -t "$JMX_FILE" `
            -l "$RESULTS_FILE" `
            -Jhost=$host_url `
            -Jport=$port `
            -e -o "$REPORT_DIR\$TIMESTAMP"
    }
    "headless" {
        Write-Host "[*] Ejecutando en modo headless (sin GUI, sin reporte HTML)..." -ForegroundColor Yellow
        & "$JMETER_BIN" -n `
            -t "$JMX_FILE" `
            -l "$RESULTS_FILE" `
            -Jhost=$host_url `
            -Jport=$port
    }
    "gui" {
        Write-Host "[*] Abriendo JMeter con interfaz grafica..." -ForegroundColor Green
        & "$JMETER_BIN" -t "$JMX_FILE"
        exit 0
    }
    default {
        Write-Host "[ERROR] Modo no reconocido: $mode" -ForegroundColor Red
        Write-Host "Modos validos: load, stress, headless, gui" -ForegroundColor Yellow
        exit 1
    }
}

# Mostrar resultado
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Prueba completada exitosamente!" -ForegroundColor Green
    Write-Host "     Resultados: $RESULTS_FILE" -ForegroundColor White
    if ($mode -ne "headless") {
        Write-Host "     Reporte HTML: $REPORT_DIR\$TIMESTAMP\index.html" -ForegroundColor White
        # Abrir reporte en el navegador
        $report_index = "$REPORT_DIR\$TIMESTAMP\index.html"
        if (Test-Path $report_index) {
            Start-Process $report_index
        }
    }
} else {
    Write-Host ""
    Write-Host "[ERROR] La prueba termino con errores (codigo: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "        Revisa el archivo de resultados: $RESULTS_FILE" -ForegroundColor Yellow
}
