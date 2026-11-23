# Documentación API — Plataforma de Gestión de Eventos

Base URL: `/api`  
Autenticación: `Authorization: Bearer <token>` (Laravel Sanctum)

---

## Fase 1: Autenticación y Perfil

### 1. Registro (Organizador por defecto)
* **Método y Ruta:** `POST /api/auth/register`
* **Payload:**
```json
{
  "name": "Ana Organizador",
  "email": "ana@example.com",
  "password": "Password123!",
  "password_confirmation": "Password123!",
  "phone": "+593999999999",
  "device_name": "web"
}
```
* **Respuesta (`201`):**
```json
{
  "token": "1|...",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "name": "Ana Organizador",
    "email": "ana@example.com",
    "phone": "+593999999999",
    "avatar_url": null,
    "email_verified_at": null,
    "has_smtp_configured": false,
    "smtp_email": null,
    "roles": ["organizer"],
    "permissions": ["events.view", "events.create", "..."],
    "created_at": "2026-11-13T18:00:00.000000Z"
  }
}
```

### 2. Login
* **Método y Ruta:** `POST /api/auth/login`
* **Payload:**
```json
{
  "email": "ana@example.com",
  "password": "Password123!",
  "device_name": "mobile"
}
```
* **Respuesta (`200`):** Mismo formato que `register` (`token`, `token_type`, `user`). Error `401` si las credenciales son inválidas.

### 3. Logout
* **Método y Ruta:** `POST /api/auth/logout` *(Requiere `auth:sanctum`)*
* **Respuesta (`200`):**
```json
{
  "message": "Logged out successfully."
}
```

### 4. Perfil Autenticado
* **Método y Ruta:** `GET /api/user` *(Requiere `auth:sanctum`)*
* **Respuesta (`200`):** Objeto `user` con `has_smtp_configured`, `smtp_email`, `roles` y `permissions`.

### 5. Configuración SMTP del Usuario (Encriptada)
* **`GET /api/user/smtp-settings`** — Devuelve la configuración SMTP guardada (sin `password`) o `null`.
* **`PUT /api/user/smtp-settings`** — Guarda/actualiza credenciales SMTP (auto-detecta `gmail.com`, `outlook.com`/`hotmail.com`/`live.com` y `yahoo.com`; exige `host` y `port` para dominios corporativos):
```json
{
  "from_email": "eventos@miempresa.com",
  "from_name": "Mi Empresa",
  "username": "eventos@miempresa.com",
  "password": "app-password-o-clave-smtp",
  "host": "smtp.miempresa.com",
  "port": 587,
  "encryption": "tls"
}
```
* **`POST /api/user/smtp-settings/test`** — Prueba la conexión/autenticación SMTP (`{ "use_saved": true }` o enviando `from_email`, `password` y opcionales `host`, `port`, `encryption`). Retorna `200` o `422`.
* **`DELETE /api/user/smtp-settings`** — Elimina las credenciales SMTP guardadas.

### 6. OAuth Redirect (`google` | `apple`)
* **Método y Ruta:** `GET /api/auth/oauth/{provider}/redirect` *(solo scopes básicos de login).*
* **Respuesta (`200`):**
```json
{
  "provider": "google",
  "url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### 6. OAuth Callback (`google` | `apple`, stateless)
* **Método y Ruta:** `GET|POST /api/auth/oauth/{provider}/callback`
* **Respuesta (`200`):** `token`, `token_type`, `user` (crea usuario con rol `organizer` si no existe).

---

## Fase 2: Módulo Core de Eventos y Arquitectura Modular

Módulos disponibles (`module_key`): `providers`, `inventory`, `rsvp`, `schedule`, `budget`, `tasks`.

### 1. Listar Eventos del Organizador
* **Método y Ruta:** `GET /api/events` *(Requiere `auth:sanctum`)*
* **Respuesta (`200`):**
```json
{
  "data": [
    {
      "id": 1,
      "organizer_id": 1,
      "title": "Boda Pérez - Gómez",
      "description": "Ceremonia y recepción",
      "location": "Hacienda El Bosque",
      "location_url": "https://maps.google.com/?q=...",
      "starts_at": "2026-12-20T18:00:00.000000Z",
      "ends_at": "2026-12-21T02:00:00.000000Z",
      "status": "active",
      "modules": [
        { "id": 1, "module_key": "providers", "is_enabled": true, "settings": null }
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 2. Crear Evento (crea los 6 módulos por defecto)
* **Método y Ruta:** `POST /api/events` *(Requiere `auth:sanctum`)*
* **Payload:**
```json
{
  "title": "Boda Pérez - Gómez",
  "description": "Ceremonia y recepción",
  "location": "Hacienda El Bosque",
  "location_url": "https://maps.google.com/?q=hacienda",
  "starts_at": "2026-12-20T18:00:00Z",
  "ends_at": "2026-12-21T02:00:00Z",
  "status": "active",
  "modules": [
    { "module_key": "inventory", "is_enabled": false }
  ]
}
```
* **Respuesta (`201`):** Objeto `data` del evento con su arreglo `modules`.

### 3. Ver Detalle de Evento
* **Método y Ruta:** `GET /api/events/{event}` *(Requiere `auth:sanctum` y ser dueño)*
* **Respuesta (`200`):** Objeto `data` del evento con `modules`. (`403` si no es el dueño).

### 4. Actualizar Evento
* **Método y Ruta:** `PUT|PATCH /api/events/{event}` *(Requiere `auth:sanctum` y ser dueño)*
* **Payload:** Campos parciales o completos (`title`, `description`, `location`, `location_url`, `starts_at`, `ends_at`, `status`).
* **Respuesta (`200`):** Objeto `data` actualizado.

### 5. Eliminar Evento (Soft Delete)
* **Método y Ruta:** `DELETE /api/events/{event}` *(Requiere `auth:sanctum` y ser dueño)*
* **Respuesta (`200`):**
```json
{
  "message": "Event deleted successfully."
}
```

### 6. Activar / Desactivar Módulos de un Evento
* **Método y Ruta:** `PUT /api/events/{event}/modules` *(Requiere `auth:sanctum` y ser dueño)*
* **Payload:**
```json
{
  "modules": [
    { "module_key": "inventory", "is_enabled": true },
    { "module_key": "tasks", "is_enabled": false, "settings": { "view": "kanban" } }
  ]
}
```
* **Respuesta (`200`):**
```json
{
  "data": [
    { "id": 1, "module_key": "providers", "is_enabled": true, "settings": null },
    { "id": 2, "module_key": "inventory", "is_enabled": true, "settings": null },
    { "id": 6, "module_key": "tasks", "is_enabled": false, "settings": { "view": "kanban" } }
  ]
}
```


---

## Fase 3: Módulos Operativos Backend

> **Middleware Modular (`module:<key>`):** Todas las rutas anidadas bajo `/api/events/{event}/...` validan que el módulo correspondiente (`providers`, `rsvp`, `inventory`, `schedule`, `budget`, `tasks`) tenga `is_enabled = true` para ese evento. Si está apagado, retornan `403 Forbidden`.

---

### A. Directorio Global de Proveedores (Organizador)

* **`GET /api/providers`** — Lista el directorio de proveedores del organizador.
* **`POST /api/providers`** — Crea un proveedor en el directorio:
```json
{
  "user_id": 2,
  "business_name": "DJ Master",
  "category": "Música",
  "contact_name": "Luis",
  "email": "dj@example.com",
  "phone": "+593988888888",
  "notes": "Incluye cabina LED"
}
```
* **`GET /api/providers/{provider}`** | **`PUT|PATCH /api/providers/{provider}`** | **`DELETE /api/providers/{provider}`**

---

### B. Proveedores Asignados al Evento (`module:providers`)

* **`GET /api/events/{event}/providers`** — Lista los proveedores asignados al evento con su checklist.
* **`POST /api/events/{event}/providers`** — Asigna un proveedor del directorio al evento:
```json
{
  "provider_id": 1,
  "user_id": 2,
  "service_description": "Música y luces",
  "agreed_cost": 1200,
  "advance_paid": 400,
  "setup_at": "2026-12-20T15:00:00Z",
  "show_at": "2026-12-20T20:00:00Z",
  "teardown_at": "2026-12-21T02:00:00Z",
  "status": "confirmed"
}
```
* **`PUT|PATCH /api/events/{event}/providers/{eventProvider}`** | **`DELETE /api/events/{event}/providers/{eventProvider}`**
* **`POST /api/events/{event}/providers/{eventProvider}/checklist`** — Agrega un ítem al checklist ("qué lleva"):
```json
{ "item_name": "Parlantes JBL", "quantity": 2, "notes": "Con trípodes" }
```
* **`PUT|PATCH /api/events/{event}/providers/{eventProvider}/checklist/{checklistItem}`** | **`DELETE .../{checklistItem}`**

---

### C. Portal del Proveedor Autenticado (`/api/provider/...`)

* **`GET /api/provider/events`** — Lista los eventos asignados al proveedor autenticado (solo eventos con módulo `providers` activo).
* **`GET /api/provider/events/{event}`** *(requiere `module:providers`)* — Detalle de su asignación y checklist en ese evento.
* **`GET /api/provider/events/{event}/schedule`** *(requiere `module:schedule`)* — Cronograma general del evento con sus horarios (`my_timings`) e indicador `is_mine` por ítem.
* **`PATCH /api/provider/checklist/{checklistItem}/toggle`** — Permite marcar/desmarcar únicamente `is_prepared` en sus propios ítems:
```json
{ "is_prepared": true }
```

---

### D. Invitados y RSVP con Magic Links

#### Organizador (`module:rsvp`)
* **`GET /api/events/{event}/guests`** | **`POST /api/events/{event}/guests`** | **`GET /api/events/{event}/guests/{guest}`** | **`PUT|PATCH .../{guest}`** | **`DELETE .../{guest}`**
  * Payload `POST`:
  ```json
  { "name": "Carlos Pérez", "email": "carlos@example.com", "phone": "+593...", "passes_count": 3 }
  ```
* **`POST /api/events/{event}/guests/{guest}/magic-link`** — Genera un token criptográfico único (revoca links anteriores del invitado):
  * Respuesta (`201`): `{ "data": { "id": 1, "guest_id": 1, "token": "...", "rsvp_url": ".../api/rsvp/...", "expires_at": null } }`

#### Público (Sin autenticación)
* **`GET /api/rsvp/{token}`** — Obtiene detalles públicos del evento y estado actual del invitado.
* **`POST /api/rsvp/{token}/confirm`** — Confirma o rechaza asistencia:
```json
{
  "rsvp_status": "confirmed",
  "confirmed_passes": 2,
  "notes": "1 menú vegetariano"
}
```

---

### E. Inventario (`module:inventory`)

* **`GET /api/events/{event}/inventory`** | **`POST /api/events/{event}/inventory`** | **`GET|PUT|PATCH|DELETE .../{inventoryItem}`**
  * Payload `POST`: `{ "name": "Cajas de Agua", "category": "Bebidas", "unit": "cajas", "planned_qty": 10 }`
* **`PATCH /api/events/{event}/inventory/{inventoryItem}/check-in`** — Actualiza `actual_qty` en tiempo real y calcula/asigna estado (`pending`, `partial`, `checked_in`, `checked_out`):
```json
{ "actual_qty": 6, "status": "partial", "notes": "Faltan 4 cajas" }
```

---

### F. Módulos Complementarios

* **Cronograma (`module:schedule`):** `GET|POST /api/events/{event}/schedule`, `GET|PUT|PATCH|DELETE /api/events/{event}/schedule/{scheduleItem}`
  * Payload `POST`: `{ "title": "Apertura", "starts_at": "2026-12-20T18:00:00Z", "ends_at": "...", "location_area": "Salón A", "event_provider_id": null }`
* **Presupuesto (`module:budget`):** `GET|POST /api/events/{event}/budget`, `GET|PUT|PATCH|DELETE /api/events/{event}/budget/{budgetItem}`
  * `GET` retorna `data` y `summary` (`total_estimated`, `total_actual`, `total_paid`).
  * Payload `POST`: `{ "category": "Decoración", "title": "Flores", "estimated_amount": 500, "actual_amount": 450, "paid_amount": 200, "status": "partial" }`
* **Tareas Kanban (`module:tasks`):** `GET|POST /api/events/{event}/tasks`, `GET|PUT|PATCH|DELETE /api/events/{event}/tasks/{task}`
  * Payload `POST`: `{ "title": "Confirmar catering", "status": "todo", "priority": "high", "due_at": "2026-12-10T12:00:00Z" }`

---

### G. Envío de Invitaciones (SMTP Dinámico por Usuario y WhatsApp Efímero con QR)

> **Cero fallback al `.env`:** El endpoint nunca utiliza `MAIL_MAILER` ni `MAIL_FROM_ADDRESS` del servidor. Requiere `smtp_mode` (`saved` o `custom`); si no existen credenciales válidas retorna `422 Unprocessable Entity`.

* **`POST /api/events/{event}/guests/invitations/email`** *(requiere `module:rsvp`)* — Envía invitaciones por correo con Magic Link (1 o más invitados en `guest_ids`, o todos si se omite):
  * **Modo Guardado (`saved`):** Usa la configuración encriptada de `user_smtp_settings` del usuario autenticado.
  ```json
  {
    "smtp_mode": "saved",
    "guest_ids": [1, 2]
  }
  ```
  * **Modo Personalizado al vuelo (`custom`):** Auto-detecta host/puerto/encriptación para `gmail.com`, `outlook.com`/`hotmail.com`/`live.com` y `yahoo.com` (exige `smtp_host` y `smtp_port` en dominios corporativos). Si `save_credentials: true`, guarda/actualiza `user_smtp_settings` tras un envío exitoso.
  ```json
  {
    "smtp_mode": "custom",
    "guest_ids": [1, 2],
    "smtp_email": "eventos@miempresa.com",
    "smtp_password": "app-password-o-clave-smtp",
    "smtp_host": "smtp.miempresa.com",
    "smtp_port": 587,
    "smtp_encryption": "tls",
    "save_credentials": true
  }
  ```
  * **Respuesta (`200`):**
  ```json
  {
    "message": "Se enviaron 2 invitación(es) desde eventos@miempresa.com.",
    "data": {
      "sent": 2,
      "skipped": 0,
      "failed": 0,
      "total_targeted": 2,
      "smtp_mode": "custom",
      "sender_email": "eventos@miempresa.com",
      "credentials_saved": true,
      "results": []
    }
  }
  ```
  * **Errores:** `422` si falta `smtp_mode`, si `smtp_mode: "saved"` no tiene configuración guardada, si falta `host`/`port` en dominio corporativo o si fallan las credenciales/conexión SMTP.
* **`POST /api/events/{event}/guests/invitations/whatsapp/start`** *(requiere `module:rsvp`)* — Crea una sesión efímera en el microservicio de WhatsApp (`WHATSAPP_SERVICE_URL`) para enviar invitaciones a `guest_ids` (o a todos los que tengan teléfono). Retorna `session_id` y `status: "waiting_qr"`.
* **`GET /api/events/{event}/guests/invitations/whatsapp/{sessionId}`** — Devuelve el estado (`waiting_qr`, `sending`, `completed`, `error`, `expired`, `cancelled`), el código `qr` en Base64 DataURL y el progreso (`sent`, `failed`, `total`, `session_closed`).
* **`DELETE /api/events/{event}/guests/invitations/whatsapp/{sessionId}`** — Cancela y destruye la sesión efímera inmediatamente.
