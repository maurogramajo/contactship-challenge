import { z } from "zod";

export const recommendedChannelSchema = z.enum([
  "whatsapp",
  "call",
  "email",
  "instagram",
]);

export const actionTypeSchema = z.enum([
  "create_note",
  "create_task",
  "create_meeting",
]);

export const actionPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const actionStatusSchema = z.enum([
  "available",
  "executed",
  "pending",
]);

export const actionableActionInputSchema = z
  .object({
    type: actionTypeSchema,
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    priority: actionPrioritySchema,
    suggestedExecutionAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const actionableActionSchema = actionableActionInputSchema
  .extend({
    id: z.string().min(1),
    status: actionStatusSchema,
    executedAt: z.string().datetime().optional(),
    externalId: z.string().min(1).optional(),
    lastError: z.string().min(1).optional(),
    retryCount: z.number().int().nonnegative().optional(),
  })
  .strict();

export type RecommendedChannel = z.infer<typeof recommendedChannelSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;
export type ActionPriority = z.infer<typeof actionPrioritySchema>;
export type ActionStatus = z.infer<typeof actionStatusSchema>;
export type ActionableActionInput = z.infer<typeof actionableActionInputSchema>;
export type ActionableAction = z.infer<typeof actionableActionSchema>;
