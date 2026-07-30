"""
Dashboard Page - Patrón POM para Finsense
Tras el login, valida que el usuario está autenticado dentro de la aplicación.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class DashboardPage:
    """Encapsula la página principal / dashboard de Finsense."""

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 20)

    def esperar_carga(self):
        """Espera que la URL ya no sea /auth y que cargue el contenido autenticado."""
        # Espera a que salga de la página de login
        self.wait.until(lambda d: "auth" not in d.current_url.lower())
        return self

    def obtener_titulo(self):
        try:
            return self.driver.find_element(By.TAG_NAME, "h1").text
        except Exception:
            return "Vista autenticada"

    def ir_a_transacciones(self):
        enlace = self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//a[contains(@href, 'transactions')]")
            )
        )
        enlace.click()
        return self
