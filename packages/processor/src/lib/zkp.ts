import { config } from "@intmax2-claim-aggregator/shared";
import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import type {
  CreateGnarkProofResponse,
  CreateProofResponse,
  GetZKProofResponse,
  GnarkProof,
  ProverRequestParams,
  WithdrawalProof,
} from "../types";

export const createWithdrawalProof = async (
  id: string,
  singleWithdrawalProof: string,
  prevWithdrawalProof: string | null,
) => {
  return makeProverRequest<CreateProofResponse>({
    method: "post",
    path: "aggregator-prover/proof/claim",
    data: {
      id,
      singleWithdrawalProof,
      prevWithdrawalProof,
    },
  });
};

export const createWrappedProof = async (
  id: string,
  withdrawalAggregatorAddress: string,
  withdrawalProof: string,
) => {
  return makeProverRequest<CreateProofResponse>({
    method: "post",
    path: "aggregator-prover/proof/wrapper/claim",
    data: {
      id,
      withdrawalAggregator: withdrawalAggregatorAddress,
      withdrawalProof,
    },
  });
};

export const createGnarkProof = async (wrappedProof: string) => {
  return makeProverRequest<CreateGnarkProofResponse>({
    method: "post",
    path: "gnark-server/start-proof",
    data: {
      proof: wrappedProof,
    },
  });
};

export const getWithdrawalProof = async (proofId: string) => {
  return makeProverRequest<GetZKProofResponse<WithdrawalProof>>({
    method: "get",
    path: `aggregator-prover/proof/claim/${proofId}`,
  });
};

export const getWithdrawalWrapperProof = async (proofId: string) => {
  return makeProverRequest<GetZKProofResponse<string>>({
    method: "get",
    path: `aggregator-prover/proof/wrapper/claim/${proofId}`,
  });
};

export const getGnarkProof = async (jobId: string) => {
  return makeProverRequest<GetZKProofResponse<GnarkProof>>({
    method: "get",
    path: `gnark-server/get-proof`,
    params: {
      jobId,
    },
  });
};

const makeProverRequest = async <T>({ method, path, data, params }: ProverRequestParams) => {
  try {
    const requestConfig: AxiosRequestConfig = {
      method,
      url: `${config.ZKP_PROVER_URL}/v1/beta/${path}`,
      headers: {
        contentType: "application/json",
      },
    };

    if (params) {
      requestConfig.params = params;
    }

    if (data) {
      requestConfig.data = data;
    }

    const response = await axios(requestConfig);

    if (response.status !== 200) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    if ("success" in response.data && !response.data.success) {
      throw new Error(response.data.message || "Request failed");
    }

    return response.data as T;
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
};

const handleAxiosError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      throw new Error(
        `HTTP error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
      );
    } else if (axiosError.request) {
      throw new Error("Network error: No response received from the server");
    } else {
      throw new Error(`Request error: ${axiosError.message}`);
    }
  }
};
