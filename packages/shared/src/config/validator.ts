import { makeValidator } from "envalid";

export const ethPrivateKey = makeValidator<`0x${string}`>((input) => {
  if (typeof input !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(input)) {
    throw new Error("E2E_ETH_PRIVATE_KEY must be 0x followed by 64 hex characters");
  }
  return input as `0x${string}`;
});

export const contractAddress = makeValidator<`0x${string}`>((input) => {
  if (typeof input !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(input)) {
    throw new Error("Contract Address must be 0x followed by 40 hex characters");
  }
  return input as `0x${string}`;
});

export const rpcUrls = makeValidator<string[]>((value: string) => {
  if (!value) {
    throw new Error("L1_RPC_URLS is required");
  }

  const urls = value.split(",").map((url) => url.trim());

  if (urls.length === 0) {
    throw new Error("At least one RPC URL is required");
  }

  urls.forEach((urlStr, index) => {
    try {
      const urlObj = new URL(urlStr);

      if (urlObj.protocol !== "https:") {
        throw new Error(`Non-HTTPS URL detected at index ${index}`);
      }
    } catch (error) {
      throw new Error(
        `Invalid URL at index ${index} - ${error instanceof Error ? error.message : error}`,
      );
    }
  });

  return urls;
});
