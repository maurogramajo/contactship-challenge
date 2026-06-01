# ContactShip AI + HubSpot Intelligence Layer

## Objetivo del Challenge

Construir una solución orientada a producto que demuestre cómo ContactShip podría integrarse con HubSpot para generar recomendaciones accionables utilizando inteligencia artificial.

El objetivo NO es construir otro CRM.

El objetivo NO es reconstruir ContactShip.

El objetivo es demostrar:

* Pensamiento de producto.
* Arquitectura de integración.
* Automatización de workflows.
* Casos de uso reales para IA.
* Capacidad para tomar decisiones técnicas y justificar tradeoffs.

---

# Principio Fundamental

La integración con HubSpot será real.

La integración con ContactShip será conceptual.

No tenemos acceso a:

* APIs internas completas de ContactShip.
* Herramientas reales de WhatsApp.
* Herramientas reales de llamadas.
* Herramientas reales de Instagram.
* Historiales reales de conversaciones.
* Infraestructura real de agentes IA.

Por lo tanto:

NO intentaremos reconstruir ContactShip.

NO implementaremos canales de comunicación reales.

NO inventaremos sistemas paralelos de comunicación.

Utilizaremos los conceptos y modelos visibles en la documentación pública de ContactShip para representar el flujo de negocio esperado.

Referencia:

https://docs.contactship.ai/api-reference/introduction

---

# Estado Actual

Actualmente la aplicación ya puede:

* Autenticarse contra HubSpot.
* Obtener contactos desde HubSpot.
* Mostrar contactos en la interfaz.
* Mapear contactos HubSpot al modelo utilizado por ContactShip.

Ejemplo:

```json
{
  "id": "hubspot:224908388175",
  "full_name": "Juan Perez",
  "email": "juan@empresa.com",
  "phone_number": "+5491112345678",
  "description": "lead",
  "external_id": "224908388175",
  "source": "hubspot"
}
```

Mapeo actual:

```ts
description =
  lifecyclestage ||
  hs_lead_status
```

---

# Problema Detectado

Actualmente un contacto sólo contiene:

* Nombre
* Email
* Teléfono
* Estado HubSpot

Con esta información no es posible determinar una acción útil.

Ejemplo:

```json
{
  "full_name": "Juan Perez",
  "description": "lead"
}
```

No existe suficiente contexto para responder:

* ¿Debemos venderle algo?
* ¿Debemos hacer soporte?
* ¿Debemos recuperar al cliente?
* ¿Debemos hacer cobranza?
* ¿Debemos agendar una reunión?

La IA necesita entender qué intenta lograr la empresa.

---

# Solución

Agregar una capa de inteligencia basada en objetivos de negocio.

La organización deberá configurar qué intenta lograr.

La IA utilizará:

* Objetivo organizacional.
* Información HubSpot.
* Información del contacto.
* Actividad simulada compatible con ContactShip.
* Notas previas.
* Historial de recomendaciones.

Para generar una próxima acción sugerida.

---

# Dominio ContactShip

Debemos respetar el dominio visible de ContactShip.

Podemos asumir la existencia de conceptos como:

* Contactos.
* Llamadas.
* Conversaciones.
* Agentes IA.
* Campañas.
* Contexto adicional.
* Interacciones omnicanal.

No debemos crear sistemas paralelos innecesarios.

---

# Nueva Capacidad: Objetivo Organizacional

La única extensión funcional importante será una configuración organizacional que permita definir el objetivo del negocio.

Ejemplos:

```text
Vender software odontológico a clínicas de Latinoamérica.
```

```text
Recuperar clientes inactivos utilizando WhatsApp y llamadas.
```

```text
Generar reuniones comerciales para el equipo de ventas.
```

```text
Reducir carga operativa del equipo de soporte.
```

---

# Modelo

```ts
OrganizationAISettings {
  organization_id: string

  objective: string

  additional_instructions?: string

  created_at: Date
  updated_at: Date
}
```

---

# Pantalla de Configuración

Crear sección:

```text
AI Settings
```

Campos:

* Objetivo principal.
* Instrucciones adicionales.

Ejemplo:

Objetivo:

```text
Convertir leads en clientes.
```

Instrucciones:

```text
Priorizar WhatsApp como canal principal.
```

---

# Contactos

Mantener una única vista de contactos.

No separar visualmente contactos HubSpot y ContactShip.

El usuario debe ver una única experiencia.

Campos:

* Nombre
* Email
* Teléfono
* Estado
* Origen

Ejemplo:

```text
Juan Perez
Lead
HubSpot
```

---

# Detalle de Contacto

Mostrar:

* Información HubSpot.
* Estado actual.
* Historial de actividad.
* Historial de recomendaciones.
* Acciones sugeridas por IA.

---

# Simulación de Actividad

No ejecutaremos llamadas reales.

No enviaremos mensajes reales.

No integraremos WhatsApp real.

No integraremos Instagram real.

No integraremos Email real.

La actividad será simulada para representar cómo funcionaría ContactShip.

---

# Actividad Compatible con ContactShip

Utilizar estructuras compatibles con el dominio de ContactShip.

Ejemplo:

```ts
ContactInteraction {
  id: string

  contact_id: string

  type: "call" | "whatsapp" | "instagram" | "email"

  direction: "outbound" | "inbound"

  summary: string

  outcome: string

  created_at: Date
}
```

Ejemplos:

```text
WhatsApp enviado.
```

```text
Cliente respondió solicitando información.
```

```text
Llamada completada.
```

```text
Cliente pidió agendar una demo.
```

---

# Objetivo de la Simulación

La simulación existe únicamente para:

* Alimentar recomendaciones IA.
* Generar contexto histórico.
* Demostrar workflows.
* Demostrar integración HubSpot ↔ ContactShip.
* Mostrar pensamiento de producto.

---

# Generación de Actionables

Agregar acción:

```text
Generar Próxima Acción
```

desde el detalle del contacto.

---

# Contexto para IA

La IA recibirá:

## Objetivo organizacional

Ejemplo:

```text
Vender software odontológico.
```

## Contacto

```json
{
  "full_name": "...",
  "email": "...",
  "phone_number": "...",
  "status": "lead"
}
```

## Actividad histórica

* llamadas
* WhatsApp
* email
* Instagram

## Notas previas

## Recomendaciones anteriores

---

# Resultado Esperado

```json
{
  "summary": "Lead con potencial de conversión.",
  "recommended_channel": "whatsapp",
  "recommended_action": "Enviar mensaje introductorio",
  "reasoning": "No existen interacciones previas y WhatsApp es el canal principal definido por la organización.",
  "draft_message": "Hola Juan..."
}
```

---

# Persistencia de Recomendaciones

Crear entidad:

```ts
ContactActionable {
  id: string

  organization_id: string
  contact_id: string

  summary: string

  recommended_channel: string

  recommended_action: string

  draft_message?: string

  reasoning?: string

  snapshot: Json

  created_at: Date
}
```

---

# Historial de Recomendaciones

Mostrar timeline:

```text
15:30
Enviar WhatsApp

14:20
Programar llamada

10:15
Enviar email introductorio
```

---

# Integración HubSpot

La integración HubSpot será completamente real.

Permitirá:

* Leer contactos.
* Actualizar contactos.
* Crear notas.
* Crear tareas.
* Actualizar propiedades.

---

# Workflow Principal

```text
HubSpot Contact
        ↓
Detalle Contacto
        ↓
Generar Próxima Acción
        ↓
IA analiza:

- Objetivo organizacional
- Estado HubSpot
- Historial de actividad
- Notas previas
- Recomendaciones anteriores

        ↓
Genera Actionable

        ↓
Usuario ejecuta acción

        ↓
Se registra interacción compatible con ContactShip

        ↓
Opcionalmente se sincroniza una nota o tarea en HubSpot
```

---

# Fuera de Alcance

No implementar:

* Sincronización bidireccional completa.
* Resolución de conflictos.
* Automatizaciones automáticas.
* Ejecución real de WhatsApp.
* Ejecución real de llamadas.
* Ejecución real de Instagram.
* Workflows complejos.

---

# MVP Final

La solución debe permitir:

✅ Conectar HubSpot

✅ Obtener contactos HubSpot

✅ Configurar objetivo organizacional

✅ Visualizar contactos

✅ Abrir detalle de contacto

✅ Generar recomendaciones IA

✅ Persistir recomendaciones

✅ Mostrar historial de recomendaciones

✅ Crear notas o tareas en HubSpot

Todo el sistema debe demostrar cómo ContactShip podría transformar contactos provenientes de HubSpot en acciones concretas alineadas con los objetivos del negocio.
