import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, maskLastFour } from "./crypto";

describe("crypto", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  it("round-trips a secret", () => {
    const plaintext = "sk-ant-apikey-abc123verylongsecret";
    const parts = encryptSecret(plaintext);
    expect(parts.ciphertext).not.toContain(plaintext);
    expect(decryptSecret(parts)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("masks to last four", () => {
    expect(maskLastFour("sk-ant-api03-abcd1234")).toBe("1234");
    expect(maskLastFour("ab")).toBe("ab");
  });
});
