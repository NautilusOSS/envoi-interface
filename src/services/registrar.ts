import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { stringToUint8Array } from "./registry";

export class RegistrarService {
  private client: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private contractId: number;
  private contractInstance: any;

  constructor(
    network: "mainnet" | "testnet",
    contractId: number = network === "mainnet" ? 797609 : 0, // Replace 0 with testnet ID when available
    address: string = "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ"
  ) {
    const baseServer =
      network === "mainnet"
        ? "https://mainnet-api.voi.nodely.dev"
        : "https://testnet-api.voi.nodely.dev";
    const indexerServer =
      network === "mainnet"
        ? "https://mainnet-idx.voi.nodely.dev"
        : "https://testnet-idx.voi.nodely.dev";

    this.client = new algosdk.Algodv2("", baseServer, "");
    this.indexerClient = new algosdk.Indexer("", indexerServer, "");
    this.contractId = contractId;
    this.contractInstance = new CONTRACT(
      this.contractId,
      this.client,
      this.indexerClient,
      {
        name: "vnsRegistrar",
        desc: "Registrar contract for Voi names",
        methods: [
          {
            name: "expiration",
            args: [{ type: "uint256", name: "name" }],
            returns: { type: "uint256" },
          },
        ],
        events: [],
      },
      { addr: address, sk: new Uint8Array() }
    );
  }

  async expiration(tokenId: BigInt): Promise<boolean> {
    try {
      const expirationR = await this.contractInstance.expiration(tokenId);
      console.log({ expirationR });
      return expirationR.returnValue;
    } catch (error) {
      console.error("Error checking name:", error);
      return false;
    }
  }
}
