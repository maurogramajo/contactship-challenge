import { z } from "zod";

export const syncTaskTypeSchema = z.enum([
  "create_contact",
  "create_note",
  "create_task",
  "create_meeting",
]);

export const syncTaskStatusSchema = z.enum([
  "pending",
  "completed",
  "failed",
]);

export type SyncTaskType = z.infer<typeof syncTaskTypeSchema>;
export type SyncTaskStatus = z.infer<typeof syncTaskStatusSchema>;
