import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/calendar/crypto";

const TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe("calendar token encryption", () => {
  it("round-trips an encrypted token", () => {
    const encrypted = encryptToken("sensitive-oauth-token", TEST_KEY);

    expect(encrypted).not.toContain("sensitive-oauth-token");
    expect(decryptToken(encrypted, TEST_KEY)).toBe("sensitive-oauth-token");
  });

  it("rejects tampered ciphertext", () => {
    const parts = encryptToken("sensitive-oauth-token", TEST_KEY).split(":");
    const ciphertext = Buffer.from(parts[2], "base64");
    ciphertext[0] = ciphertext[0] ^ 1;
    parts[2] = ciphertext.toString("base64");

    expect(() => decryptToken(parts.join(":"), TEST_KEY)).toThrow();
  });
});
