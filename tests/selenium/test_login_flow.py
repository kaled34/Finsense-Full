"""
FINSENSE - Prueba E2E: Flujo de Login y Dashboard
Patrón POM con Selenium + ChromeDriver

Uso:
    python test_login_flow.py
"""

import sys
import time
import os

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Ruta relativa a las páginas POM
sys.path.insert(0, os.path.dirname(__file__))
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage


def crear_driver():
    """Configura y retorna un WebDriver de Chrome robusto para Vercel."""
    opciones = Options()
    # Evita banners de "Chrome está siendo controlado por software automatizado"
    opciones.add_experimental_option("excludeSwitches", ["enable-automation"])
    opciones.add_experimental_option("useAutomationExtension", False)
    # Evita bloqueos por User-Agent
    opciones.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    )
    # Ignora errores de certificado SSL
    opciones.add_argument("--ignore-certificate-errors")
    # Deshabilita log de DevTools para salida más limpia
    opciones.add_experimental_option("excludeSwitches", ["enable-logging"])

    driver = webdriver.Chrome(options=opciones)
    driver.maximize_window()
    return driver


def test_flujo_login_y_dashboard():
    """
    Flujo E2E de Finsense:
      1. Abre la página /auth
      2. Ingresa credenciales reales
      3. Verifica que redirige correctamente a /dashboard
    """
    driver = crear_driver()

    login_page     = LoginPage(driver)
    dashboard_page = DashboardPage(driver)

    print("\n" + "=" * 55)
    print("   FINSENSE - Flujo de Login y Navegación")
    print("=" * 55)

    try:
        # ── 1. Login ─────────────────────────────────────────────
        print("\n[1] Abriendo página de login ...")
        login_page.login("kaled.hdez.kaled@gmail.com", "Kaled34")
        print("   ✔ Formulario enviado.")

        # ── 2. Verificar dashboard ───────────────────────────────
        print("\n[2] Esperando carga del Dashboard ...")
        dashboard_page.esperar_carga()

        url_actual = driver.current_url
        titulo     = dashboard_page.obtener_titulo()

        print(f"   ✔ Dashboard cargado.")
        print(f"   ✔ URL actual  : {url_actual}")
        print(f"   ✔ Título (h1) : {titulo}")

        # ── 3. Verificación ───────────────────────────────────────
        assert "dashboard" in url_actual.lower(), \
            f"Se esperaba /dashboard, pero se obtuvo: {url_actual}"

        print("\n   VERIFICACION EXITOSA: Login funciona y redirige al dashboard ✅")

    except AssertionError as ae:
        print(f"\n   FALLO DE ASSERTION: {ae}")
        raise

    except Exception as e:
        print(f"\n   ERROR inesperado: {e}")
        raise

    finally:
        time.sleep(2)
        driver.quit()
        print("\n   Navegador cerrado.\n")


if __name__ == "__main__":
    test_flujo_login_y_dashboard()
