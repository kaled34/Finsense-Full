"""
Login Page - Patrón POM para Finsense
URL de autenticación: /auth
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LoginPage:
    """
    Encapsula la página de inicio de sesión de Finsense.

    Los IDs de los campos son generados automáticamente por el componente
    Input.tsx de Finsense con la lógica:
        label.toLowerCase().replace(/\s+/g, '-')

    - "Correo electrónico" → id="correo-electrónico"
    - "Contraseña"         → id="contraseña"
    """

    URL = "https://finsense-full-seven.vercel.app/auth"

    # ── Selectores (basados en los IDs generados por Input.tsx) ──
    ID_EMAIL    = "correo-electrónico"
    ID_PASSWORD = "contraseña"
    # El botón de submit no tiene ID fijo; usamos type + texto
    CSS_SUBMIT  = "button[type='submit']"

    def __init__(self, driver):
        self.driver = driver
        # Timeout generoso para absorber hidratación de Next.js + Vercel cold start
        self.wait = WebDriverWait(driver, 25)

    def abrir(self):
        """Navega a la página de login y espera que el campo de email esté listo."""
        self.driver.get(self.URL)
        # Esperamos por ID generado por el componente Input.tsx
        self.wait.until(
            EC.presence_of_element_located((By.ID, self.ID_EMAIL))
        )
        print(f"   ✔ Página de login cargada: {self.driver.current_url}")
        return self

    def ingresar_email(self, email):
        campo = self.wait.until(
            EC.element_to_be_clickable((By.ID, self.ID_EMAIL))
        )
        campo.clear()
        campo.send_keys(email)
        return self

    def ingresar_password(self, password):
        campo = self.wait.until(
            EC.element_to_be_clickable((By.ID, self.ID_PASSWORD))
        )
        campo.clear()
        campo.send_keys(password)
        return self

    def click_login(self):
        boton = self.wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, self.CSS_SUBMIT))
        )
        boton.click()
        return self

    def login(self, email, password):
        """Flujo completo: abre, rellena y envía el formulario de login."""
        return (
            self.abrir()
                .ingresar_email(email)
                .ingresar_password(password)
                .click_login()
        )
