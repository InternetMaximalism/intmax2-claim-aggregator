import axios from "axios";
import { config } from "../config";

export const getBlockNumberByTimestamp = async (
  timestamp: number,
  closest: "before" | "after" = "after",
) => {
  try {
    const url = `${config.ETHERSCAN_URL}/api`;

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
