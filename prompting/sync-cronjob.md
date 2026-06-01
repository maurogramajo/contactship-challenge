# Sincronización Diferida de Actionables con HubSpot

## Objetivo

Garantizar que las acciones ejecutadas por el usuario no se pierdan cuando HubSpot no esté disponible.

Cuando una acción falle por problemas temporales de conectividad o disponibilidad de HubSpot:

- La acción debe quedar marcada como pendiente.
- Debe crearse una tarea de sincronización.
- El sistema intentará completarla automáticamente cuando HubSpot vuelva a estar disponible.

---

# Estados de las acciones

Cada acción de un actionable puede tener los siguientes estados:

```ts
type ActionStatus =
  | "available"
  | "pending"
  | "executed";
```

## available

La acción fue recomendada por IA y todavía no fue ejecutada.

## pending

El usuario solicitó ejecutar la acción pero HubSpot no estaba disponible o la operación falló temporalmente.

La acción queda pendiente de sincronización.

## executed

La acción fue creada exitosamente en HubSpot.

---

# Nuevo modelo: SyncTask

Crear una nueva entidad para representar operaciones pendientes de sincronización.

```ts
type SyncTaskType =
  | "create_contact"
  | "create_note"
  | "create_task"
  | "create_meeting";

type SyncTaskStatus =
  | "pending"
  | "completed"
  | "failed";

interface SyncTask {
  id: string;

  organizationId: string;

  actionableId: string;

  actionId: string;

  type: SyncTaskType;

  status: SyncTaskStatus;

  payload: Record<string, unknown>;

  retryCount: number;

  lastError?: string;

  executedAt?: string;

  createdAt: string;

  updatedAt: string;
}
```

---

# Creación de SyncTask

## Contactos

Cuando falle:

```ts
createContact(...)
```

Se debe crear automáticamente:

```ts
{
  type: "create_contact",
  status: "pending",
  retryCount: 0
}
```

---

## Notas

Cuando falle:

```ts
createNote(...)
```

Se debe crear:

```ts
{
  type: "create_note",
  status: "pending",
  retryCount: 0
}
```

---

## Tareas

Cuando falle:

```ts
createTask(...)
```

Se debe crear:

```ts
{
  type: "create_task",
  status: "pending",
  retryCount: 0
}
```

---

## Meetings

Cuando falle:

```ts
createMeeting(...)
```

Se debe crear:

```ts
{
  type: "create_meeting",
  status: "pending",
  retryCount: 0
}
```

---

# Actualización del estado del Actionable

Cuando una acción falla y se crea un SyncTask:

Actualizar la acción correspondiente:

```ts
action.status = "pending";
```

Ejemplo:

```txt
Antes

○ Seguimiento comercial
```

```txt
Después

⏳ Seguimiento comercial
```

---

# CronJob de sincronización

Crear un cronjob que se ejecute cada minuto.

Objetivo:

Procesar tareas pendientes con HubSpot.

---

## Paso 1

Verificar disponibilidad de HubSpot.

Helper sugerido:

```ts
isHubSpotAvailable()
```

---

## Paso 2

Si HubSpot no está disponible:

```txt
Finalizar ejecución
```

No procesar tareas.

---

## Paso 3

Buscar la tarea pendiente más antigua.

```sql
ORDER BY createdAt ASC
LIMIT 1
```

---

## Paso 4

Intentar ejecutar nuevamente la operación.

Según:

```ts
task.type
```

Ejemplos:

```ts
create_contact
```

↓

```ts
createContact(...)
```

---

```ts
create_note
```

↓

```ts
createNote(...)
```

---

```ts
create_task
```

↓

```ts
createTask(...)
```

---

```ts
create_meeting
```

↓

```ts
createMeeting(...)
```

---

# Éxito

Si la operación se ejecuta correctamente:

Actualizar SyncTask:

```ts
{
  status: "completed",
  executedAt: new Date()
}
```

---

Actualizar también la acción original:

```ts
{
  status: "executed",
  executedAt: new Date(),
  externalId: hubspotResourceId
}
```

---

Resultado visual:

```txt
Antes

⏳ Seguimiento comercial
```

```txt
Después

✅ Seguimiento comercial
```

---

# Error

Si la operación vuelve a fallar:

```ts
retryCount += 1
```

Guardar:

```ts
lastError
```

---

# Límite de reintentos

Cuando:

```ts
retryCount >= 5
```

Actualizar:

```ts
{
  status: "failed"
}
```

La tarea no debe volver a ejecutarse automáticamente.

---

# Página: Sync Pendientes

Crear nueva sección:

```txt
Sync Pendientes
```

Objetivo:

Permitir visualizar todas las sincronizaciones pendientes con HubSpot.

---

# Columnas

Mostrar:

```txt
Fecha creación
Tipo
Estado
Retry Count
Ejecutado el
Último error
```

---

# Estados visuales

```txt
⏳ Pending
```

```txt
✅ Completed
```

```txt
❌ Failed
```

---

# Acción manual

Para tareas fallidas permitir:

```txt
Reintentar
```

Al hacer click:

```ts
status = "pending";
retryCount = 0;
lastError = null;
```

---

# Comportamiento esperado

Escenario:

1. Usuario ejecuta "Crear tarea".
2. HubSpot está caído.
3. La acción pasa a estado `pending`.
4. Se crea un `SyncTask`.
5. El cron detecta que HubSpot volvió.
6. Reintenta automáticamente.
7. La tarea se crea en HubSpot.
8. El `SyncTask` pasa a `completed`.
9. La acción original pasa a `executed`.

El usuario verá automáticamente el cambio de estado sin necesidad de volver a ejecutar la acción.