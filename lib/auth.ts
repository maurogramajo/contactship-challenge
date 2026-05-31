import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_SECRET ??
  "FLDSMDFR_FLINT_LOCO_LLUVIA_DE_HAMBURGUESAS";
const PASSWORD_SALT_ROUNDS = 10;

type VerifyableTokenPayload = Record<string, unknown>;

export type AccessTokenPayload = {
  sub: string;
  email: string;
  type: "access";
  iat: number;
  exp: number;
};

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, PASSWORD_SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export function signToken(
  payload: VerifyableTokenPayload,
  expiresIn: SignOptions["expiresIn"] = "7d",
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): VerifyableTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return typeof decoded === "object" && decoded !== null ? decoded : null;
  } catch {
    return null;
  }
}

export function createAccessToken(
  subject: string,
  email: string,
  expiresInSeconds = 60 * 60 * 12,
): string {
  return signToken(
    {
      sub: subject,
      email,
      type: "access",
    },
    `${expiresInSeconds}s`,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  const { sub, email, type, iat, exp } = payload;
  if (
    typeof sub !== "string" ||
    typeof email !== "string" ||
    type !== "access" ||
    typeof iat !== "number" ||
    typeof exp !== "number"
  ) {
    return null;
  }

  return { sub, email, type, iat, exp };
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function createOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function generateUUID(): string {
  return crypto.randomUUID();
}
