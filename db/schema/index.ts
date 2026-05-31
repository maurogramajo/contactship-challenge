import { relations } from "drizzle-orm";
import { contacts } from "./contacts";
import { calls } from "./calls";
import { comments } from "./comments";
import { tags, contactTags } from "./tags";
import { contactActionables } from "./contact-actionables";
import { organizations } from "./organizations";
import { organizationRefreshTokens } from "./organization-refresh-tokens";
import { hubspotConnections } from "./hubspot-connections";
import { organizationAiSettings } from "./organization-ai-settings";

// ── Contacts ──────────────────────────────────────────────────────────────

export const contactsRelations = relations(contacts, ({ many }) => ({
  calls: many(calls),
  comments: many(comments),
  actionables: many(contactActionables),
  contactTags: many(contactTags),
}));

// ── Calls ─────────────────────────────────────────────────────────────────

export const callsRelations = relations(calls, ({ one }) => ({
  contact: one(contacts, {
    fields: [calls.contact_id],
    references: [contacts.id],
  }),
}));

// ── Comments ──────────────────────────────────────────────────────────────

export const commentsRelations = relations(comments, ({ one }) => ({
  contact: one(contacts, {
    fields: [comments.contact_id],
    references: [contacts.id],
  }),
}));

// ── Contact Actionables ───────────────────────────────────────────────────

export const contactActionablesRelations = relations(
  contactActionables,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactActionables.contact_id],
      references: [contacts.id],
    }),
  }),
);

// ── Tags ──────────────────────────────────────────────────────────────────

export const tagsRelations = relations(tags, ({ many }) => ({
  contactTags: many(contactTags),
}));

// ── Contact Tags (junction) ───────────────────────────────────────────────

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTags.contact_id],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tag_id],
    references: [tags.id],
  }),
}));

// ── Organizations ─────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  refreshTokens: many(organizationRefreshTokens),
  hubspotConnections: many(hubspotConnections),
  aiSettings: one(organizationAiSettings),
}));

// ── Refresh Tokens ────────────────────────────────────────────────────────

export const organizationRefreshTokensRelations = relations(
  organizationRefreshTokens,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationRefreshTokens.organization_id],
      references: [organizations.id],
    }),
  }),
);

// ── HubSpot Connections ───────────────────────────────────────────────────

export const hubspotConnectionsRelations = relations(
  hubspotConnections,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [hubspotConnections.organization_id],
      references: [organizations.id],
    }),
  }),
);

// ── Organization AI Settings ─────────────────────────────────────────────

export const organizationAiSettingsRelations = relations(
  organizationAiSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationAiSettings.organization_id],
      references: [organizations.id],
    }),
  }),
);

// ── Re-exports ────────────────────────────────────────────────────────────

export { contacts } from "./contacts";
export { calls } from "./calls";
export { comments } from "./comments";
export { tags, contactTags } from "./tags";
export { contactActionables } from "./contact-actionables";
export { organizations } from "./organizations";
export { organizationRefreshTokens } from "./organization-refresh-tokens";
export { hubspotConnections } from "./hubspot-connections";
export { organizationAiSettings } from "./organization-ai-settings";

export type { Contact, NewContact } from "./contacts";
export type { Call, NewCall } from "./calls";
export type { Comment, NewComment } from "./comments";
export type { Tag, NewTag, ContactTag, NewContactTag } from "./tags";
export type { Organization, NewOrganization } from "./organizations";
export type {
  OrganizationRefreshToken,
  NewOrganizationRefreshToken,
} from "./organization-refresh-tokens";
export type {
  HubSpotConnection,
  NewHubSpotConnection,
} from "./hubspot-connections";
export type {
  OrganizationAiSettings,
  NewOrganizationAiSettings,
} from "./organization-ai-settings";
export type {
  ContactActionable,
  NewContactActionable,
} from "./contact-actionables";
export { sourceEnum } from "./contacts";
export { directionEnum, statusEnum } from "./calls";
