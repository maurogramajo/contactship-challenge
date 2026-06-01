import "dotenv/config";

type RequiredEnvOptions = {
  minLength?: number;
};

export function requireEnv(
  name: keyof NodeJS.ProcessEnv,
  options: RequiredEnvOptions = {},
): string {
  const value = process.env[name];
  const minLength = options.minLength ?? 1;

  if (typeof value !== "string" || value.length < minLength) {
    const suffix =
      minLength > 1 ? ` with at least ${minLength} characters` : "";
    throw new Error(`Missing required environment variable: ${name}${suffix}`);
  }

  return value;
}
