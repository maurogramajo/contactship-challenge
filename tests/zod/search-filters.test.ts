import { describe, it, expect } from "bun:test";
import { searchFiltersSchema } from "@/db/zod/search-filters";

describe("searchFiltersSchema", () => {
  it("should validate a complete set of search filters", () => {
    const result = searchFiltersSchema.safeParse({
      name_contains: "María",
      email_contains: "gmail",
      source: "hubspot",
      has_activity_since: "2025-01-01",
      has_tag: "vip",
      activity_type: "call",
      min_calls: 3,
      max_days_inactive: 30,
    });
    expect(result.success).toBe(true);
  });

  it("should validate an empty set (all fields optional)", () => {
    const result = searchFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name_contains).toBeUndefined();
    }
  });

  it("should reject invalid activity_type enum value", () => {
    const result = searchFiltersSchema.safeParse({
      activity_type: "email",
    });
    expect(result.success).toBe(false);
  });
});
