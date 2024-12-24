import algosdk from "algosdk";
import { CONTRACT, abi } from "ulujs";
import { stringToUint8Array } from "./registry";

export class ARC72Service {
  private client: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private contractId: number;
  private mode: "default" | "builder";
  private contractInstance: any;
  private builder: any;
  constructor(
    network: "mainnet" | "testnet",
    address: string = "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
    contractId: number
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
    this.mode = "default";
    this.contractInstance = new CONTRACT(
      this.contractId,
      this.client,
      this.indexerClient,
      {
        name: "vnsRegistrar",
        desc: "Registrar contract for Voi names",
        methods: abi.arc72.methods,
        events: [],
      },
      { addr: address, sk: new Uint8Array() }
    );
    this.builder = new CONTRACT(
      this.contractId,
      this.client,
      this.indexerClient,
      {
        name: "vnsRegistrar",
        desc: "Registrar contract for Voi names",
        methods: abi.arc72.methods,
        events: [],
      },
      { addr: address, sk: new Uint8Array() },
      true,
      false,
      true
    );
  }

  setMode(mode: "default" | "builder") {
    this.mode = mode;
  }

  async ownerOf(tokenId: bigint): Promise<any> {
    try {
      const arc72_ownerOfR = await this.contractInstance.arc72_ownerOf(tokenId);
      return arc72_ownerOfR.returnValue;
    } catch (error) {
      console.error("Error checking name:", error);
      return false;
    }
  }
}
