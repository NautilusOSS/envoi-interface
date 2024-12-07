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

export const createRSVPService = (
  appId: number,
  senderAddress: string
): RSVPContract => {
  const contract = new CONTRACT(
    appId,
    algodClient,
    null,
    {
      name: "rsvp",
      description: "RSVP contract for VOI names",
      methods: [
        {
          name: "price",
          args: [{ type: "uint64", name: "length" }],
          returns: { type: "uint64" },
        },
        {
          name: "reserve",
          args: [
            { type: "byte[32]", name: "node" },
            { type: "byte[256]", name: "name" },
            { type: "uint64", name: "length" },
          ],
          returns: { type: "void" },
        },
        {
          name: "release",
          args: [{ type: "byte[32]", name: "node" }],
          returns: { type: "void" },
        },
        {
          name: "account_node",
          args: [{ type: "address", name: "account" }],
          returns: { type: "byte[32]" },
        },
        {
          name: "reservation_name",
          args: [{ type: "byte[32]", name: "node" }],
          returns: { type: "byte[256]" },
        },
        {
          name: "reservation_price",
          args: [{ type: "byte[32]", name: "node" }],
          returns: { type: "uint64" },
        },
      ],
      events: [],
    },
    {
      addr: senderAddress,
      sk: new Uint8Array(0),
    }
  );

  return {
    price: async (length: number) => {
      const result = await contract.price(length);
      return result.returnValue;
    },

    reserve: async (node: string, label: string) => {
      const price = await contract.price(label.length);
      contract.setPaymentAmount(price.returnValue + BigInt(168000));
      console.log(await namehash(node));
      const nodeName = `${label}.${node}`;
      const nodeHash = await namehash(nodeName);
      console.log({
        node,
        nodeName,
        hash: Buffer.from(nodeHash).toString("hex"),
      });
      const result = await contract.reserve(
        nodeHash,
        new TextEncoder().encode(nodeName.padEnd(256, "\0")),
        label.length
      );
      return result;
    },

    release: async (node: string) => {
      contract.setFee(2000);
      const result = await contract.release(await namehash(node));
      return result;
    },

    accountNode: async (account: string) => {
      const result = await contract.account_node(account);
      return result.returnValue;
    },

    reservationName: async (node: Uint8Array) => {
      const result = await contract.reservation_name(node);
      return result.returnValue;
    },

    reservationPrice: async (node: Uint8Array) => {
      const result = await contract.reservation_price(node);
      return result.returnValue;
    },
  };
};
