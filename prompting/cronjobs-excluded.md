# Refactor de Insights IA y Actionables

## Contexto

Actualmente `lib/ai/insights.ts` genera recomendaciones utilizando un campo libre:

```ts
recommended_action: string
```

Queremos reemplazar este enfoque por acciones estructuradas y tipadas.

La idea es que la IA no recomiende texto arbitrario sino intenciones operativas concretas que puedan ser ejecutadas posteriormente.

---

# Objetivo

Modificar el flujo de generación de insights para que la IA solamente pueda devolver acciones pertenecientes a un conjunto predefinido.

Acciones permitidas:

```ts
type ActionType =
  | "create_note"
  | "create_task"
  | "create_meeting";
```

---

# Nuevo formato esperado

La respuesta de IA deberá seguir una estructura similar a:

```ts
{
  summary: string;

  recommended_channel:
    | "whatsapp"
    | "call"
    | "email"
    | "instagram";

  actions: [
    {
      type: "create_task";
      title: string;
      description: string;
    }
  ];

  reasoning?: string;
}
```

---

# Comportamiento esperado

## create_note

Representa una recomendación para crear una nota en HubSpot.

Ejemplo:

```json
{
  "type": "create_note",
  "title": "Registrar interés comercial",
  "description": "El cliente mostró interés en una propuesta enterprise."
}
```

---

## create_task

Representa una tarea de seguimiento.

Ejemplo:

```json
{
  "type": "create_task",
  "title": "Seguimiento comercial",
  "description": "Contactar al cliente vía WhatsApp esta semana."
}
```

---

## create_meeting

Representa una recomendación para agendar una reunión.

Ejemplo:

```json
{
  "type": "create_meeting",
  "title": "Demo de producto",
  "description": "Coordinar reunión con el área técnica."
}
```

---

# Persistencia

Los actionables generados deben almacenarse en la tabla correspondiente.

Cada actionable debe contener:

```ts
{
  id: string;

  contactId: string;

  summary: string;

  actions: Action[];

  prompt: string;

  snapshot: Json;

  createdAt: Date;
}
```

---

# Estado de las acciones

Cada acción debe mantener su propio estado de ejecución.

Esto permitirá saber:

* Qué acciones recomendó la IA.
* Cuáles ya fueron ejecutadas.
* Cuáles quedaron pendientes de sincronización.

Modelo sugerido:

```ts
type ActionStatus =
  | "available"
  | "executed"
  | "pending";
```

---

## Significado de cada estado

### available

La IA generó la recomendación pero todavía no fue ejecutada.

Ejemplo:

```txt
✓ Disponible para ejecutar
```

---

### executed

La acción fue ejecutada exitosamente y sincronizada con HubSpot.

Ejemplo:

```txt
✓ Ejecutada
```

---

### pending

La acción fue solicitada por el usuario pero no pudo completarse inmediatamente debido a problemas temporales.

Ejemplos:

* HubSpot sin conexión.
* Timeout.
* Rate limiting.
* Error temporal de API.

La acción queda pendiente para ser sincronizada posteriormente.

Ejemplo:

```txt
⏳ Pendiente de sincronización
```

---

# Modelo sugerido para Action

```ts
{
  id: string;

  type:
    | "create_note"
    | "create_task"
    | "create_meeting";

  title: string;

  description: string;

  status:
    | "available"
    | "executed"
    | "pending";

  executedAt?: string;

  externalId?: string;

  lastError?: string;

  retryCount?: number;
}
```

---

# Ejecución manual de acciones

Los actionables deben mostrarse en la interfaz.

Cada acción podrá ejecutarse manualmente.

Ejemplos:

```txt
[Crear nota en HubSpot]
```

```txt
[Crear tarea en HubSpot]
```

```txt
[Agendar reunión en HubSpot]
```

---

# Comportamiento esperado al ejecutar una acción

## create_note

Al ejecutarse:

* Crear una nota en HubSpot.
* Guardar el identificador devuelto por HubSpot.
* Marcar la acción como ejecutada.

Ejemplo:

```ts
{
  status: "executed",
  executedAt: "2026-05-31T18:30:00Z",
  externalId: "hubspot_note_123"
}
```

---

## create_task

Al ejecutarse:

* Crear una tarea en HubSpot.
* Guardar el identificador devuelto por HubSpot.
* Marcar la acción como ejecutada.

---

## create_meeting

Al ejecutarse:

* Crear una reunión en HubSpot.
* Guardar el identificador devuelto por HubSpot.
* Marcar la acción como ejecutada.

---

# Beneficios

Esta información permitirá:

* Evitar ejecuciones duplicadas.
* Mantener trazabilidad.
* Saber qué recomendaciones fueron aplicadas.
* Mostrar historial de acciones ejecutadas.
* Preparar el sistema para futuras automatizaciones.

---

# UI Esperada

Ejemplo:

```txt
Acciones recomendadas

✓ Crear tarea de seguimiento
✓ Registrar nota comercial
○ Agendar reunión técnica
```

Donde:

```txt
✓ Ejecutada
○ Disponible
⏳ Pendiente
```

---

# Consideraciones de Arquitectura

Aunque este challenge no implementará procesamiento automático, el modelo queda preparado para futuras evoluciones:

* Reintentos automáticos.
* Colas de procesamiento.
* Workers.
* Sincronización asíncrona.
* Automatización de agentes.

La presencia de campos como:

```ts
lastError?: string;
retryCount?: number;
```

permite evolucionar la solución sin modificar el modelo principal.

---

# Fuera de alcance

Las siguientes funcionalidades fueron evaluadas pero NO deben implementarse en este challenge.

## Automatización de ejecución

No implementar:

* CronJobs.
* Workers.
* Schedulers.
* Procesamiento automático de tareas.

---

## Cola de tareas pendientes

No implementar:

```txt
Pending Actions Queue
```

ni tablas relacionadas con:

* pending queue
* retry queue
* dead letter queue
* execution queue

---

## Reintentos automáticos

No implementar lógica para:

* reintentar creación de contactos
* reintentar creación de notas
* reintentar creación de tareas
* reintentar creación de meetings

---

## Sincronización automática basada en eventos

No implementar:

* ejecución automática de actionables
* procesamiento automático de recomendaciones
* actualización automática de lead status
* sincronización automática de tareas pendientes

---

## Simulación de ContactShip

No implementar:

* llamadas simuladas
* envío de WhatsApp simulado
* agentes automáticos
* ejecución automática de acciones sugeridas

---

# Alcance final

El alcance debe quedar limitado a:

1. Generar insights mediante IA.
2. Generar acciones estructuradas.
3. Persistir los actionables.
4. Mostrar los actionables al usuario.
5. Permitir ejecutar manualmente las acciones sugeridas.
6. Registrar el resultado de cada ejecución.
7. Mostrar qué acciones fueron ejecutadas y cuáles siguen disponibles o pendientes.

La ejecución automática y la orquestación operativa quedan explícitamente fuera del challenge.
