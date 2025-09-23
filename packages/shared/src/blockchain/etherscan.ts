import axios from "axios";
import { config } from "../config";
import { logger } from "../lib";

const NO_CLOSEST_BLOCK_FOUND = "No closest block found";

export const getBlockNumberByTimestamp = async (
  timestamp: number,
  closest: "before" | "after" = "after",
) => {
  const tryClosest = async (closestParam: "before" | "after") => {
    try {
      const response = await axios.get(config.ETHERSCAN_URL, {
        params: {
          chainid: config.ETHERSCAN_CHAIN_ID,
          module: "block",
          action: "getblocknobytime",
          timestamp: timestamp,
          closest: closestParam,
          apikey: config.ETHERSCAN_API_KEY,
        },
      });

      if (response.data.status === "1" && response.data.message === "OK") {
        return BigInt(parseInt(response.data.result, 10));
      }

      throw new Error(
        `API error: ${response.data.message}, Status: ${response.data.status}, Result: ${response.data.result}`,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(NO_CLOSEST_BLOCK_FOUND) &&
        closestParam === closest
      ) {
        logger.warn(`Retrying with closest="${closest === "before" ? "after" : "before"}"`);
        return tryClosest(closest === "before" ? "after" : "before");
      }

      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`HTTP error: ${error.response.status} - ${error.response.data}`);
        } else if (error.request) {
          throw new Error("Network error: No response received from the server");
        } else {
          throw new Error(`Request error: ${error.message}`);
        }
      }
      throw error;
    }
  };

  return tryClosest(closest);
};
