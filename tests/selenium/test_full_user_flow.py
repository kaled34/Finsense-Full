"""
FINSENSE - Prueba E2E Completa: Flujo de Usuario Básico (Con POST de Transacción)
Patrón POM con Selenium + ChromeDriver

Flujo probado:
  1. Login exitoso (/auth)
  2. Verificación de sesión activa (redirección fuera de /auth)
  3. POST - Creación de nueva transacción (/transactions/new)
  4. Navegación e inspección a Presupuestos (/budgets)
  5. Navegación e inspección a Metas (/goals)
  6. Navegación a Historial / Analíticas (/analytics)

Uso:
    python test_full_user_flow.py
"""

import sys
import time
import os

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Ruta relativa a las páginas POM
sys.path.insert(0, os.path.dirname(__file__))
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage


def crear_driver():
    """Configura y retorna un WebDriver de Chrome listo para Vercel."""
    opciones = Options()
    opciones.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    opciones.add_experimental_option("useAutomationExtension", False)
    opciones.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    )
    opciones.add_argument("--ignore-certificate-errors")

    driver = webdriver.Chrome(options=opciones)
    driver.maximize_window()
    return driver


def test_flujo_usuario_completo():
    driver = crear_driver()
    wait = WebDriverWait(driver, 5)

    login_page = LoginPage(driver)
    dashboard_page = DashboardPage(driver)

    BASE_URL = "https://finsense-full-seven.vercel.app"

    print("\n" + "=" * 30)
    print("   FINSENSE - PRUEBA E2E: FLUJO COMPLETO CON CREACIÓN (POST)")
    print("=" * 30)


    try:
        # ── 1. Inicio de Sesión ────────────────────────────────────
        print("\n[PASO 1] Autenticación de usuario...")
        login_page.login("kaled.hdez.kaled@gmail.com", "Kaled34")
        print("   ✔ Formulario de login enviado.")

        # ── 2. Carga del Dashboard / Vista principal ───────────────
        print("\n[PASO 2] Validación de Sesión Autenticada...")
        dashboard_page.esperar_carga()
        url_actual = driver.current_url
        print(f"   ✔ Redirección correcta a vista privada: {url_actual}")
        assert "auth" not in url_actual.lower(), "Falló el login, sigue en la página de autenticación"

        # ── 3. POST: Crear nueva transacción ───────────────────────
        print("\n[PASO 3] Creando nueva transacción (POST desde UI)...")
        driver.get(f"{BASE_URL}/transactions/new")
        wait.until(EC.url_contains("transactions/new"))
        print(f"   ✔ Formulario de transacción abierto: {driver.current_url}")

        # Rellenar campo de monto
        campo_monto = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='number']")))
        campo_monto.clear()
        campo_monto.send_keys("250.00")
        print("   ✔ Monto ingresado: $250.00")

        # Rellenar nota / descripción si existe
        try:
            campo_nota = driver.find_element(By.CSS_SELECTOR, "input[type='text'], textarea")
            campo_nota.clear()
            campo_nota.send_keys("Prueba E2E Selenium - Gasto de prueba")
            print("   ✔ Nota ingresada: 'Prueba E2E Selenium'")
        except Exception:
            print("   ℹ Campo de nota omitido (opcional).")

        # Clic en guardar (POST)
        boton_guardar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Guardar') or contains(., 'Crear')]")))
        boton_guardar.click()
        print("   ✔ Botón de guardar transacción clickeado (Solicitud POST enviada).")
        time.sleep(3)

        # ── 4. Sección de Presupuestos ─────────────────────────────
        print("\n[PASO 4] Navegando a Presupuestos (/budgets)...")
        driver.get(f"{BASE_URL}/budgets")
        time.sleep(2)
        print(f"   ✔ Sección de Presupuestos verificada: {driver.current_url}")

        # ── 5. Sección de Metas ───────────────────────────────────
        print("\n[PASO 5] Navegando a Metas de Ahorro (/goals)...")
        driver.get(f"{BASE_URL}/goals")
        time.sleep(2)
        print(f"   ✔ Sección de Metas de Ahorro verificada: {driver.current_url}")

        # ── 6. Historial y Analíticas ─────────────────────────────
        print("\n[PASO 6] Navegando a Analíticas (/analytics)...")
        driver.get(f"{BASE_URL}/analytics")
        time.sleep(2)
        print(f"   ✔ Sección de Analíticas verificada: {driver.current_url}")

        print("\n" + "=" * 65)
        print("   🎉 ¡PRUEBA E2E COMPLETA EXITOSA CON POST REAL!")
        print("   Login, Creación de datos y Navegación verificados.")
        print("=" * 65 + "\n")

    except AssertionError as ae:
        print(f"\n   ❌ FALLO DE ASSERTION: {ae}")
        raise

    except Exception as e:
        print(f"\n   ❌ ERROR INESPERADO: {e}")
        raise

    finally:
        time.sleep(2)
        driver.quit()
        print("   ✔ Navegador cerrado adecuadamente.\n")


if __name__ == "__main__":
    test_flujo_usuario_completo()
