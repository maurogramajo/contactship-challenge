export { getAiClient } from "./client";
export { generateContactInsight } from "./insights";
export type { InsightContext, ContactInfo, CallsStats, CommentsStats } from "./insights";
export { buildContactContext } from "./build-context";
export {
  HUBSPOT_LIFECYCLE_STAGE_VALUES,
  HUBSPOT_LEAD_STATUS_VALUES,
  inferHubSpotLeadClassification,
  inferHubSpotLeadClassificationFallback,
  hubSpotLeadClassificationSchema,
  type HubSpotLeadClassification,
  type HubSpotClassificationInput,
} from "./hubspot-classification";
