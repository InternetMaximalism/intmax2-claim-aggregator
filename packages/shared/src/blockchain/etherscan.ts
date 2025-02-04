import axios from "axios";
import { config } from "../config";
import { ETHERSCAN_URL_MAPS } from "../constants";

export const getBlockNumberByTimestamp = async (
  networkType: "ethereum" | "scroll",
  timestamp: number,
  closest: "before" | "after" = "after",
) => {
  try {
    const url =
      ETHERSCAN_URL_MAPS[`${networkType}-${config.NETWORK_ENVIRONMENT}`] ||
      ETHERSCAN_URL_MAPS["ethereum-sepolia"];
    const response = await axios.get(url, {
      params: {
        module: "block",
        action: "getblocknobytime",
        timestamp: timestamp,
        closest: closest,
        apikey: config.ETHERSCAN_API_KEY,
      },
    });

    if (response.data.status === "1" && response.data.message === "OK") {
      return BigInt(parseInt(response.data.result, 10));
    } else {
      throw new Error(
        `API error: ${response.data.message}, Status: ${response.data.status}, Result: ${response.data.result}`,
      );
    }
  } catch (error) {
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

export const getBlockNumbers = async (
  networkType: "ethereum" | "scroll",
  previousMondayTimestamp: number,
  currentMondayTimestamp: number,
) => {
  return Promise.all([
    getBlockNumberByTimestamp(networkType, Math.floor(previousMondayTimestamp / 1000)),
    getBlockNumberByTimestamp(networkType, Math.floor(currentMondayTimestamp / 1000)),
  ]);
};
