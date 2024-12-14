import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { stringToUint8Array } from "./registry";

export class ReverseRegistrarService {
  private client: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private contractId: number;
  private contractInstance: any;

  constructor(
    network: "mainnet" | "testnet",
    contractId: number = network === "mainnet" ? 797610 : 0, // Replace 0 with testnet ID when available
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
        name: "vnsReverseRegistrar",
        desc: "Reverse Registrar contract for Voi names",
        methods: [
          {
            name: "check_name",
            args: [{ type: "byte[32]", name: "name" }],
            returns: { type: "bool" },
          },
          {
            name: "register",
            args: [{ type: "byte[58]", name: "name" }],
            returns: { type: "byte[32]" },
          },
          {
            name: "set_registry",
            args: [{ type: "uint64", name: "registry" }],
            returns: { type: "void" },
          },
          {
            name: "set_payment_token",
            args: [{ type: "uint64", name: "token" }],
            returns: { type: "void" },
          },
        ],
        events: [],
      },
      { addr: address, sk: new Uint8Array() }
    );
  }

  async checkName(name: string): Promise<boolean> {
    try {
      const checkNameR = await this.contractInstance.check_name(
        algosdk.decodeAddress(name).publicKey
      );
      return checkNameR.returnValue;
    } catch (error) {
      console.error("Error checking name:", error);
      return false;
    }
  }

  async register(name: string, senderAddress: string, senderSk: Uint8Array): Promise<boolean> {
    try {
      // Update contract instance with sender credentials
      this.contractInstance = new CONTRACT(
        this.contractId,
        this.client,
        this.indexerClient,
        this.contractInstance.spec,
        { addr: senderAddress, sk: senderSk }
      );

      const registerR = await this.contractInstance.register(
        stringToUint8Array(name, 58)
      );

      if (registerR.success) {
        const txns = registerR.txns;
        // Sign and send transaction
        const signedTxns = txns.map((txn: any) => {
          return txn.signTxn(senderSk);
        });

        // Send signed transactions
        const { txId } = await this.client.sendRawTransaction(signedTxns).do();
        
        // Wait for confirmation
        await algosdk.waitForConfirmation(this.client, txId, 4);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error registering name:", error);
      return false;
    }
  }

  async setRegistry(registryId: number, senderAddress: string, senderSk: Uint8Array): Promise<boolean> {
    try {
      // Update contract instance with sender credentials
      this.contractInstance = new CONTRACT(
        this.contractId,
        this.client,
        this.indexerClient,
        this.contractInstance.spec,
        { addr: senderAddress, sk: senderSk }
      );

      const setRegistryR = await this.contractInstance.set_registry(registryId);

      if (setRegistryR.success) {
        const txns = setRegistryR.txns;
        // Sign and send transaction
        const signedTxns = txns.map((txn: any) => {
          return txn.signTxn(senderSk);
        });

        // Send signed transactions
        const { txId } = await this.client.sendRawTransaction(signedTxns).do();
        
        // Wait for confirmation
        await algosdk.waitForConfirmation(this.client, txId, 4);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error setting registry:", error);
      return false;
    }
  }

  async setPaymentToken(tokenId: number, senderAddress: string, senderSk: Uint8Array): Promise<boolean> {
    try {
      // Update contract instance with sender credentials
      this.contractInstance = new CONTRACT(
        this.contractId,
        this.client,
        this.indexerClient,
        this.contractInstance.spec,
        { addr: senderAddress, sk: senderSk }
      );

      const setPaymentTokenR = await this.contractInstance.set_payment_token(tokenId);

      if (setPaymentTokenR.success) {
        const txns = setPaymentTokenR.txns;
        // Sign and send transaction
        const signedTxns = txns.map((txn: any) => {
          return txn.signTxn(senderSk);
        });

        // Send signed transactions
        const { txId } = await this.client.sendRawTransaction(signedTxns).do();
        
        // Wait for confirmation
        await algosdk.waitForConfirmation(this.client, txId, 4);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error setting payment token:", error);
      return false;
    }
  }
} 