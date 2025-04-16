import { config } from "@intmax2-claim-aggregator/shared";
import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import type {
  ClaimProof,
  CreateGnarkProofResponse,
  CreateProofResponse,
  GetZKProofResponse,
  GnarkProof,
  ProverRequestParams,
} from "../types";

export const createClaimProof = async (
  id: string,
  singleClaimProof: string,
  prevClaimProof: string | null,
) => {
  return makeProverRequest<CreateProofResponse>({
    method: "post",
    path: "aggregator-prover/proof/claim",
    data: {
      id,
      singleClaimProof,
      prevClaimProof,
    },
  });
};

export const createClaimWrappedProof = async (
  id: string,
  claimAggregatorAddress: string,
  claimProof: string,
) => {
  return makeProverRequest<CreateProofResponse>({
    method: "post",
    path: "aggregator-prover/proof/wrapper/claim",
    data: {
      id,
      claimAggregator: claimAggregatorAddress,
      claimProof,
    },
  });
};

export const createClaimGnarkProof = async (wrappedProof: string) => {
  return makeProverRequest<CreateGnarkProofResponse>({
    method: "post",
    path: getClaimGnarkPath("start-proof"),
    data: {
      proof: wrappedProof,
    },
  });
};

export const getClaimProof = async (proofId: string) => {
  return makeProverRequest<GetZKProofResponse<ClaimProof>>({
    method: "get",
    path: `aggregator-prover/proof/claim/${proofId}`,
  });
};

export const getClaimWrapperProof = async (proofId: string) => {
  return makeProverRequest<GetZKProofResponse<string>>({
    method: "get",
    path: `aggregator-prover/proof/wrapper/claim/${proofId}`,
  });
};

export const getClaimGnarkProof = async (jobId: string) => {
  return makeProverRequest<GetZKProofResponse<GnarkProof>>({
    method: "get",
    path: getClaimGnarkPath("get-proof"),
    params: {
      jobId,
    },
  });
};

const makeProverRequest = async <T>({ method, path, data, params }: ProverRequestParams) => {
  try {
    const requestConfig: AxiosRequestConfig = {
      method,
      url: `${config.ZKP_PROVER_URL}/${path}`,
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

const getClaimGnarkPath = (endpoint: string) => {
  const basePath =
    config.CLAIM_MODE === "faster" ? "faster-claim-gnark-server" : "claim-gnark-server";
  return `${basePath}/${endpoint}`;
};
