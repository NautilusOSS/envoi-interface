import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { stringToUint8Array } from "./registry";
import { APP_SPEC as VNSRegistrarSpec } from "@/clients/VNSRegistrarClient";

export class RegistrarService {
  private client: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private contractId: number;
  private mode: "default" | "builder";
  private contractInstance: any;
  private builder: any;
  constructor(
    network: "mainnet" | "testnet",
    address: string = "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
    contractId: number = network === "mainnet" ? 797609 : 0 // Replace 0 with testnet ID when available
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
        methods: VNSRegistrarSpec.contract.methods,
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
        methods: VNSRegistrarSpec.contract.methods,
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

  async reclaim(name: string): Promise<any> {
    const namePadded = stringToUint8Array(name, 32);
    this.contractInstance.setFee(2000);
    if (this.mode === "builder") {
      return await this.builder.reclaim(namePadded);
    }
    return await this.contractInstance.reclaim(namePadded);
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

  async ownerOf(tokenId: BigInt): Promise<string> {
    const ownerR = await this.contractInstance.arc72_ownerOf(tokenId);
    return ownerR.returnValue;
  }
}
