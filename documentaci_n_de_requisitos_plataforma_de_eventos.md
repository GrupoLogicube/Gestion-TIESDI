# Documento de Requisitos del Producto (PRD)
## Plataforma de Gestión y Coordinación de Eventos

### 1. Visión General
El proyecto consiste en el desarrollo de una plataforma integral y parametrizable para la organización y coordinación de eventos privados. El sistema permite a los organizadores gestionar invitados (RSVP), controlar presupuestos, administrar inventarios físicos en tiempo real y coordinar con proveedores externos mediante accesos controlados.

### 2. Stack Tecnológico
*   **Backend:** Laravel (API RESTful, Gestión de Base de Datos, Lógica de Negocio, Emisión de Tokens).
*   **Frontend Web (Panel Administrativo):** React.
*   **Frontend Móvil (App Organizadores y Proveedores):** React Native (iOS / Android).

### 3. Autenticación y Seguridad
*   **Métodos de acceso:** 
    *   Correo electrónico y contraseña.
    *   OAuth (Google, Apple, etc.) para un registro e inicio de sesión rápido.
*   **Control de Accesos (RBAC):** Sistema basado en roles para restringir vistas según el tipo de usuario.

### 4. Roles del Sistema
1.  **Administrador / Organizador:** Tiene control total del evento. Puede parametrizar los módulos, agregar invitados, gestionar proveedores y visualizar dashboards financieros y de inventario.
2.  **Proveedor (Vendor / Guest User):** Usuario limitado. Accede al sistema (vía web móvil o descargando la app en React Native) exclusivamente para ver la ficha técnica de los servicios que debe proveer en un evento específico ("qué lleva", horarios, ubicación).
3.  **Invitado / Asistente:** No requiere cuenta ni autenticación. Interactúa con el sistema a través de un enlace único (Magic Link) para confirmar su asistencia.

### 5. Arquitectura Modular y Parametrizable
Cada evento creado en el sistema es independiente y parametrizable. El Organizador dispone de *checkboxes* para activar o desactivar módulos según la complejidad de la fiesta (ej. si una fiesta no tiene inventario propio, ese módulo se apaga).

#### 5.1. Módulo Core (Dashboard)
*   Resumen del evento: Fecha, lugar, cuenta regresiva.
*   Métricas rápidas: % de invitados confirmados, tareas pendientes.
*   Panel de configuración de módulos activos.

#### 5.2. Módulo de Proveedores (Contratistas)
*   **Directorio:** Registro de proveedores (DJs, banqueteros, decoradores).
*   **Ficha de Contratación:** Registro detallado de acuerdos. Ejemplo: DJ (Costo, horario de set-up, horario de show).
*   **Checklist de Responsabilidades ("Qué lleva"):** Lista exacta de equipos requeridos (ej. 2 parlantes, 1 consola).
*   **Portal del Proveedor:** Generación de credenciales para que el proveedor inicie sesión y visualice *únicamente* su ficha de responsabilidades y horarios.

#### 5.3. Módulo de Inventario (Logística)
*   Registro de ítems necesarios para el evento (ej. colas, licores, bocaditos, sillas).
*   Cantidades planificadas vs. reales.
*   **Check-in/Check-out Móvil:** Uso de la app en React Native para marcar la llegada de productos al local en tiempo real.

#### 5.4. Módulo de Invitados (RSVP)
*   Registro de invitados (Nombre, Correo, Celular, Cantidad de pases).
*   **Generación de Links de Confirmación:** El sistema genera un enlace único por invitado. El organizador copia y envía este enlace **manualmente** a través de su propio WhatsApp o correo.
*   **Landing Page (React):** Interfaz donde el invitado ve los detalles de la fiesta, confirma/rechaza asistencia y añade notas (ej. alergias).
*   *Nota: Este módulo es estrictamente organizativo. No incluye venta de tickets ni pasarelas de pago.*

#### 5.5. Módulos Complementarios Sugeridos
*   **Cronograma (Itinerario):** Línea de tiempo del evento para sincronizar a organizadores y proveedores.
*   **Presupuestos:** Control de gastos vs. presupuesto inicial. Control de anticipos dados a proveedores.
*   **Tareas (Kanban):** Lista de tareas previas al evento (To Do, In Progress, Done).

### 6. Requisitos Funcionales Clave
*   **RF01:** El sistema debe permitir el inicio de sesión mediante credenciales estándar y OAuth.
*   **RF02:** El sistema debe permitir habilitar o deshabilitar módulos (Inventario, Proveedores, etc.) por cada evento creado.
*   **RF03:** El sistema debe generar enlaces únicos para la confirmación de invitados.
*   **RF04:** Los proveedores deben poder autenticarse (en web o app nativa) y acceder a una vista de "solo lectura" de sus responsabilidades asignadas.
*   **RF05:** La aplicación móvil (React Native) debe permitir la actualización de inventarios in-situ mediante una interfaz rápida.

### 7. Requisitos No Funcionales
*   **RNF01 (UX/UI):** Interfaces fluidas y limpias, orientadas a la acción en entornos de alto estrés (organización de eventos).
*   **RNF02 (Rendimiento):** El backend debe soportar picos de tráfico ligeros cuando se envíen masivamente los links de invitación.
*   **RNF03 (Seguridad):** Los links de los invitados deben estar ofuscados (con tokens) para evitar que un usuario manipule la URL y modifique la asistencia de otro.