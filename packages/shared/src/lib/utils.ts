import { randomBytes } from "node:crypto";

export const sleep = (ms = 1000) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getRandomString = (length: number): string => {
  const bytes = randomBytes(Math.ceil(length / 2));
  return bytes.toString("hex").slice(0, length);
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  return btoa(
    Array.from(bytes)
      .map((byte) => String.fromCharCode(byte))
      .join(""),
  );
};
