import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { namehash } from "../utils/namehash";

// Constants
const ALGO_SERVER = "https://mainnet-api.voi.nodely.io";
const algodClient = new algosdk.Algodv2("", ALGO_SERVER, "");

export interface RSVPContract {
  price: (length: number) => Promise<number>;
  reserve: (node: string, label: string) => Promise<any>;
  release: (node: string) => Promise<any>;
  accountNode: (account: string) => Promise<Uint8Array>;
  reservationName: (node: Uint8Array) => Promise<Uint8Array>;
  reservationPrice: (node: Uint8Array) => Promise<number>;
}

export const createRSVPService = (contractId: number, address: string) => {
  const endpoints = NETWORK_CONFIG[selectedNetwork];
  
  return new RSVPService({
    algodUrl: endpoints.algodUrl,
    indexerUrl: endpoints.indexerUrl,
    contractId,
    address
  });
};
