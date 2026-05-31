# ContactShip AI - Challenge Técnico Lead Engineer

# Contexto

ContactShip es una plataforma omnicanal impulsada por agentes de inteligencia artificial. Las empresas utilizan ContactShip para gestionar y automatizar conversaciones con clientes a través de múltiples canales como llamadas telefónicas, WhatsApp, SMS, correo electrónico y redes sociales.

Uno de los pilares de la plataforma es la integración con sistemas externos como CRMs, ERPs, herramientas de soporte, ticketing y otras plataformas empresariales.

Para este challenge construiremos una integración con HubSpot que permita importar y sincronizar contactos dentro de ContactShip, agregando además funcionalidades de inteligencia artificial que aporten valor real al usuario.

---

# Objetivo

Construir una solución orientada a producto que permita:

- Integrar HubSpot con ContactShip.
- Importar y sincronizar contactos.
- Gestionar contactos desde ContactShip.
- Generar inteligencia sobre los contactos utilizando IA.
- Permitir búsquedas inteligentes mediante lenguaje natural.

---

# Concepto General

HubSpot será considerado la fuente externa de contactos.

ContactShip será la plataforma principal donde los usuarios podrán:

- Conectar su cuenta de HubSpot.
- Importar contactos.
- Mantener contactos sincronizados.
- Consultar información enriquecida.
- Realizar búsquedas mediante lenguaje natural.
- Generar insights y recomendaciones utilizando IA.

---

# Arquitectura

## Integración con HubSpot

### Autenticación

Implementar OAuth con HubSpot para permitir conectar una cuenta externa.

El usuario podrá autenticarse y autorizar a ContactShip para acceder a sus contactos.

---

### Importación de contactos

El usuario podrá:

- Obtener contactos desde HubSpot.
- Detectar cuáles aún no existen en ContactShip.
- Importar contactos faltantes.

---

### Webhooks

Configurar webhooks de HubSpot para detectar nuevos contactos creados.

Cuando se cree un nuevo contacto en HubSpot:

- Recibir evento webhook.
- Crear automáticamente el contacto correspondiente en ContactShip.
- Mantener sincronización entre ambos sistemas.

---

# Extensión del modelo de Contactos

Se agregará metadata de origen para soportar integraciones externas.

Ejemplo:

```ts
{
  id: string

  fullName: string
  email: string
  phoneNumber: string

  externalId: string
  source: "hubspot"

  createdAt: Date
  updatedAt: Date
}
```

Objetivos:

- Identificar el origen del contacto.
- Facilitar futuras integraciones con otros CRMs.
- Mantener trazabilidad de sincronización.

---

# Gestión de Contactos

## Listado de contactos

Pantalla principal con:

- Tabla de contactos.
- Búsqueda.
- Paginación.
- Estado de sincronización.
- Acciones de importación.

Columnas:

- Nombre
- Empresa
- Email
- Teléfono
- Origen
- Estado de sincronización

---

## Detalle de contacto

Cada contacto tendrá una vista de detalle.

Se mostrará:

- Información del contacto.
- Información proveniente de HubSpot.
- Resumen de actividad dentro de ContactShip.

Asumiremos que ContactShip ya dispone de información de interacciones como:

- Llamadas.
- Conversaciones de WhatsApp.
- Mensajes.
- Fecha de última interacción.

---

# Funcionalidad IA #1 - Búsqueda Inteligente

## Objetivo

Permitir realizar consultas utilizando lenguaje natural.

Ejemplos:

```text
¿Qué leads no tuvieron actividad en los últimos 30 días?
```

```text
¿Qué contactos tuvieron actividad reciente pero siguen siendo leads?
```

```text
¿Qué clientes del rubro salud tuvieron actividad esta semana?
```

```text
¿Qué contactos recibieron mensajes por WhatsApp pero nunca una llamada?
```

---

## Implementación

La IA NO responderá directamente.

La IA convertirá la intención del usuario en filtros estructurados que serán ejecutados contra la base de datos.

Flujo:

```text
Prompt Usuario
       ↓
LLM
       ↓
Consulta Estructurada
       ↓
Base de Datos
       ↓
Resultados
```

La base de datos continúa siendo la fuente de verdad.

---

# Funcionalidad IA #2 - Contact Intelligence

## Objetivo

Generar insights accionables sobre un contacto.

Estos insights NO serán generados automáticamente.

Serán generados bajo demanda.

---

## Generar Insights

Acción disponible desde el detalle de un contacto.

Botón:

```text
Generar Insights IA
```

La IA analizará:

- Información del contacto.
- Metadata proveniente de HubSpot.
- Historial de interacciones.
- Actividad reciente.

---

## Ejemplo de resultado

```text
Resumen Ejecutivo

Lead tecnológico con interés reciente.

La última interacción ocurrió hace 14 días.

No se registraron acciones de seguimiento posteriores.

Próxima acción sugerida:
Contactar vía WhatsApp durante los próximos 7 días.
```

---

# Persistencia de Insights

Se creará una nueva tabla:

```ts
ContactActionable
{
  id: string

  contactId: string

  prompt: string

  summary: string

  actions: string[]

  snapshot: Json

  createdAt: Date
}
```

---

## Snapshot

Cada insight almacenará una fotografía del contexto utilizado para generarlo.

Objetivos:

- Auditoría.
- Historial.
- Reproducibilidad.
- Comparación futura de recomendaciones.

---

## Ejemplo de acciones

```json
[
  "Contactar vía WhatsApp",
  "Programar llamada de seguimiento",
  "Solicitar actualización de información"
]
```

---

# Fuera de Alcance

Para mantener el challenge enfocado se excluyen:

- Sincronización bidireccional HubSpot ↔ ContactShip.
- Resolución de conflictos entre sistemas.
- Permisos avanzados.
- Edición de contactos en HubSpot.
- Sincronización en tiempo real compleja.

Dirección de sincronización:

```text
HubSpot
    ↓
ContactShip
```

Las mejoras futuras podrán documentarse en el README.

---