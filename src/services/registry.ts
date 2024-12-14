import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import pkg from "js-sha3";
const { keccak256 } = pkg;
import moment from "moment";

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

function getCrypto() {
  try {
    return window.crypto;
  } catch {
    return crypto;
  }
}

// Updated namehash function to be async
export async function namehash(
  name: string,
  algorithm: string = "sha256"
): Promise<Uint8Array> {
  if (!name) {
    return new Uint8Array(32);
  }

  const crypto = getCrypto();

  const labels = name.split(".").reverse();
  let node = new Uint8Array(32);

  for (const label of labels) {
    if (label) {
      const labelHash = await hash(label, algorithm);
      const combined = new Uint8Array([...node, ...labelHash]);
      node =
        algorithm === "keccak256"
          ? new Uint8Array(keccak256.arrayBuffer(combined))
          : new Uint8Array(await crypto.subtle.digest("SHA-256", combined));
    }
  }

  return node;
}

export interface RegistryInfo {
  owner: string;
  registrationDate: Date;
  resolver: number;
}

export class RegistryService {
  private client: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private registryId: number;
  private contractInstance: any;
  constructor(
    network: "mainnet" | "testnet",
    registryId: number = network === "mainnet" ? 0 : 30000, // Replace 0 with mainnet ID when available
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
    this.indexerClient = new algosdk.Indexer(indexerServer);
    this.registryId = registryId;
    this.contractInstance = new CONTRACT(
      this.registryId,
      this.client,
      this.indexerClient,
      {
        name: "registry",
        description: "Registry contract for Voi names",
        methods: [
          //  ownerOf(byte[32])address
          {
            name: "ownerOf",
            args: [
              {
                type: "byte[32]",
                name: "name",
              },
            ],
            returns: {
              type: "address",
              name: "owner",
            },
          },
        ],
        events: [],
      },
      { addr: address, sk: new Uint8Array() }
    );
  }

  async getExpiry(name: string): Promise<number | null> {
    try {
      // const nameHash = await namehash(name);
      // const info = await this.contractInstance.getExpiry(nameHash);
      // return info.returnValue;
      return moment().add(1, "years").unix();
    } catch (error) {
      console.error("Error getting expiry:", error);
      return null;
    }
  }

  // Update ownerOf method to be async
  async ownerOf(name: string): Promise<string | null> {
    try {
      const nameHash = await namehash(name);
      console.log({ nameHash });

      const info = await this.contractInstance.ownerOf(nameHash);
      console.log({ info });

      return info.returnValue;
    } catch (error) {
      console.error("Error getting owner:", error);
      return null;
    }
  }
}
