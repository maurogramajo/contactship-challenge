import type { ContactActionable } from "@/db/schema/contact-actionables";
import {
  actionableActionInputSchema,
  actionableActionSchema,
  type ActionType,
  type ActionPriority,
  type ActionableAction,
  type ActionableActionInput,
} from "@/db/zod/actionable";
import { z } from "zod";

export interface ActionableData {
  id: string;
  summary: string | null;
  actions: ActionableAction[];
  created_at: string;
  recommended_channel?: string | null;
  draft_message?: string | null;
  reasoning?: string | null;
}

export type StoredContactActionable = Omit<ContactActionable, "actions"> & {
  actions: ActionableAction[];
};

const legacyActionArraySchema = z.array(z.string().min(1));
const legacyStructuredActionSchema = z
  .object({
    type: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

function getDefaultPriority(type: ActionType): ActionPriority {
  if (type === "create_note") return "LOW";
  if (type === "create_meeting") return "HIGH";
  return "MEDIUM";
}

function getDefaultSuggestedExecutionAt(type: ActionType): string {
  const now = new Date();

  if (type === "create_note") {
    return now.toISOString();
  }

  const base = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return base.toISOString();
}

function inferLegacyActionType(value: string): ActionType {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("reuni") ||
    normalized.includes("demo") ||
    normalized.includes("meeting")
  ) {
    return "create_meeting";
  }

  if (
    normalized.includes("nota") ||
    normalized.includes("registr") ||
    normalized.includes("document")
  ) {
    return "create_note";
  }

  return "create_task";
}

function createStoredAction(
  action: ActionableActionInput,
  id = globalThis.crypto.randomUUID(),
): ActionableAction {
  return {
    ...action,
    id,
    status: "available",
    retryCount: 0,
  };
}

export function hydrateAiActions(
  actions: ActionableActionInput[],
): ActionableAction[] {
  return actions.map((action) => createStoredAction(action));
}

export function normalizeStoredActions(
  rawActions: unknown,
  options?: {
    actionableId?: string;
    summary?: string | null;
  },
): ActionableAction[] {
  const structuredActions = z.array(actionableActionSchema).safeParse(rawActions);
  if (structuredActions.success) {
    return structuredActions.data;
  }

  const aiActions = z.array(actionableActionInputSchema).safeParse(rawActions);
  if (aiActions.success) {
    return aiActions.data.map((action, index) =>
      createStoredAction(
        action,
        `${options?.actionableId ?? "actionable"}:${index}`,
      ),
    );
  }

  const legacyStructuredActions = z
    .array(legacyStructuredActionSchema)
    .safeParse(rawActions);
  if (legacyStructuredActions.success) {
    return legacyStructuredActions.data.map((action, index) => {
      const type = inferLegacyActionType(action.title);

      return {
        id: `${options?.actionableId ?? "actionable"}:${index}`,
        ...action,
        type,
        priority: getDefaultPriority(type),
        suggestedExecutionAt: getDefaultSuggestedExecutionAt(type),
        status: "available",
        retryCount: 0,
      };
    });
  }

  const legacyActions = legacyActionArraySchema.safeParse(rawActions);
  if (!legacyActions.success) {
    return [];
  }

  return legacyActions.data.map((title, index) => {
    const type = inferLegacyActionType(title);
    const description =
      options?.summary && options.summary !== title ? options.summary : title;

    return {
      id: `${options?.actionableId ?? "actionable"}:legacy:${index}`,
      type,
      title,
      description,
      priority: getDefaultPriority(type),
      suggestedExecutionAt: getDefaultSuggestedExecutionAt(type),
      status: "available",
      retryCount: 0,
    };
  });
}

export function normalizeActionableRecord(
  actionable: ContactActionable,
): StoredContactActionable {
  return {
    ...actionable,
    actions: normalizeStoredActions(actionable.actions, {
      actionableId: actionable.id,
      summary: actionable.summary,
    }),
  };
}

export function toActionableData(
  actionable: StoredContactActionable,
): ActionableData {
  return {
    id: actionable.id,
    summary: actionable.summary,
    actions: actionable.actions,
    created_at: String(actionable.created_at),
    recommended_channel: actionable.recommended_channel,
    draft_message: actionable.draft_message,
    reasoning: actionable.reasoning,
  };
}
