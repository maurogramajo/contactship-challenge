import { afterEach, describe, expect, it } from "bun:test";
import { requireEnv } from "@/lib/required-env";

const TEST_ENV_NAME = "CONTACTSHIP_TEST_REQUIRED_ENV" as keyof NodeJS.ProcessEnv;
const originalValue = process.env[TEST_ENV_NAME];

afterEach(() => {
  if (typeof originalValue === "string") {
    process.env[TEST_ENV_NAME] = originalValue;
    return;
  }

  delete process.env[TEST_ENV_NAME];
});

describe("requireEnv", () => {
  it("returns the configured environment variable", () => {
    process.env[TEST_ENV_NAME] = "configured-value";

    expect(requireEnv(TEST_ENV_NAME)).toBe("configured-value");
  });

  it("throws when the environment variable is missing", () => {
    delete process.env[TEST_ENV_NAME];

    expect(() => requireEnv(TEST_ENV_NAME)).toThrow(
      "Missing required environment variable: CONTACTSHIP_TEST_REQUIRED_ENV",
    );
  });

  it("throws when the environment variable is shorter than required", () => {
    process.env[TEST_ENV_NAME] = "short";

    expect(() => requireEnv(TEST_ENV_NAME, { minLength: 8 })).toThrow(
      "Missing required environment variable: CONTACTSHIP_TEST_REQUIRED_ENV with at least 8 characters",
    );
  });
});
