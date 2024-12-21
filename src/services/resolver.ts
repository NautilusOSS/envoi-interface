import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import pkg from "js-sha3";
const { keccak256 } = pkg;
import moment from "moment";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { namehash } from "@/utils/namehash";

// function that takes string and returns a Uint8Array of size 256
export function stringToUint8Array(str: string, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set(new Uint8Array(Buffer.from(str, "utf8")), 0);
  return bytes;
}

function stripTrailingZeroBytes(str: string) {
  return str.replace(/\0+$/, ""); // Matches one or more '\0' at the end of the string and removes them
}

function padStringWithZeroBytes(input: string, length: number): string {
  const paddingLength = length - input.length;

  if (paddingLength > 0) {
    const zeroBytes = "\0".repeat(paddingLength);
    return input + zeroBytes;
  }

  return input; // Return the original string if it's already long enough
}

function uint8ArrayToBigInt(uint8Array: Uint8Array) {
  let result = BigInt(0); // Initialize the BigInt result
  for (let i = 0; i < uint8Array.length; i++) {
    result = (result << BigInt(8)) + BigInt(uint8Array[i]); // Shift 8 bits and add the current byte
  }
  return result;
}

export function bytesToHex(bytes: Uint8Array): string {
  return bytes.reduce(
    (acc, byte) => acc + byte.toString(16).padStart(2, "0"),
    ""
  );
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

// Helper function to convert string to hex
function stringToHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Updated hash function to use Web Crypto API
export async function hash(
  label: string,
  algorithm: string = "sha256"
): Promise<Uint8Array> {
  if (algorithm === "keccak256") {
    const labelBytes = new TextEncoder().encode(label);
    return new Uint8Array(keccak256.arrayBuffer(labelBytes));
  }

  const msgBuffer = new TextEncoder().encode(label);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return new Uint8Array(hashBuffer);
}

export class ResolverService {
  private client: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private registryId: number;
  private mode: "default" | "builder";
  private contractInstance: any;
  private builder: any;
  constructor(
    network: "mainnet" | "testnet",
    address: string = "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
    registryId: number = network === "mainnet" ? 797608 : 0 // Replace 0 with mainnet ID when available
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
    this.indexerClient = new algosdk.Indexer(indexerServer);
    this.registryId = registryId;
    this.mode = "default";
    this.contractInstance = new CONTRACT(
      this.registryId,
      this.client,
      this.indexerClient,
      {
        name: "registry",
        description: "Registry contract for Voi names",
        methods: VNSPublicResolverSpec.contract.methods,
        events: [],
      },
      { addr: address, sk: new Uint8Array() }
    );
    this.builder = new CONTRACT(
      this.registryId,
      this.client,
      this.indexerClient,
      {
        name: "builder",
        description: "Builder contract for Voi names",
        methods: VNSPublicResolverSpec.contract.methods,
        events: [],
      },
      { addr: address, sk: new Uint8Array() },
      true,
      false,
      true
    );
  }

  getClient() {
    return this.client;
  }

  getIndexerClient() {
    return this.indexerClient;
  }

  getId() {
    return this.registryId;
  }

  setMode(mode: "default" | "builder") {
    this.mode = mode;
  }

  async text(node: string, key: string): Promise<string | null> {
    const nodeBytes = await namehash(node);
    const keyBytes = stringToUint8Array(key, 22);
    const info = await this.contractInstance.text(nodeBytes, keyBytes);
    if (info.success) {
      return stripTrailingZeroBytes(info.returnValue);
    }
    return "";
  }

  async setText(node: string, key: string, value: string): Promise<void> {
    const nodeBytes = await namehash(node);
    const keyBytes = stringToUint8Array(key, 22);
    const valueBytes = stringToUint8Array(value, 256);
    this.contractInstance.setFee(2000);
    if (this.mode === "builder") {
      return await this.builder.setText(nodeBytes, keyBytes, valueBytes);
    }
    return await this.contractInstance.setText(nodeBytes, keyBytes, valueBytes);
  }
}
