import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export function calendarEncryptionKey(
  encodedKey: string = serverEnv.calendarTokenEncryptionKey,
): Buffer {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 value.");
  }
  return key;
}

export function encryptToken(token: string, encodedKey?: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, calendarEncryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((value) => value.toString("base64")).join(":");
}

export function decryptToken(value: string, encodedKey?: string): string {
  const parts = value.split(":");
  if (parts.length !== 3) throw new Error("Encrypted calendar token is malformed.");

  const [ivPart, tagPart, ciphertextPart] = parts;
  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const ciphertext = Buffer.from(ciphertextPart, "base64");
  if (iv.length !== IV_BYTES || tag.length !== 16) {
    throw new Error("Encrypted calendar token is malformed.");
  }

  const decipher = createDecipheriv(ALGORITHM, calendarEncryptionKey(encodedKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
