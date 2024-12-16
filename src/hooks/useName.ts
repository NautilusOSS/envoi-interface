import { useState, useEffect } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { createRSVPService } from "../services/rsvp";
import { namehash } from "@/utils/namehash";
import { APP_SPEC as RegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as ResolverSpec } from "@/clients/VNSPublicResolverClient";
import { CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { stripTrailingZeroBytes } from "@/utils/string";

const RSVP_CONTRACT_ID = 797609;
const EMPTY_NODE =
  "0000000000000000000000000000000000000000000000000000000000000000";

interface UseNameResult {
  displayName: string;
  isLoading: boolean;
  error: string | null;
  isFormattedAddress: boolean;
  formatAddress: (address: string) => string;
  refetch: () => Promise<void>;
}

export const useName = (address?: string): UseNameResult => {
  const [displayName, setDisplayName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = address;

  const formatAddress = (addr: string): string =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const fetchName = async () => {
    if (!targetAddress) {
      setDisplayName("");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = {
        registry: new CONTRACT(
          797607,
          algodClient,
          indexerClient,
          {
            name: "registry",
            description: "Registry",
            methods: RegistrySpec.contract.methods,
            events: [],
          },
          {
            addr: targetAddress,
            sk: new Uint8Array(),
          }
        ),
        resolver: new CONTRACT(
          797608,
          algodClient,
          indexerClient,
          {
            name: "resolver",
            description: "Resolver",
            methods: ResolverSpec.contract.methods,
            events: [],
          },
          {
            addr: targetAddress,
            sk: new Uint8Array(),
          }
        ),
      };

      const label = `${targetAddress}.addr.reverse`;
      const node = await namehash(label);
      const ownerOfR = await ci.registry.ownerOf(node);
      if (!ownerOfR.success) {
        throw new Error("Failed to get owner of node");
      }
      const ownerOf = ownerOfR.returnValue;
      if (ownerOf !== targetAddress) {
        setDisplayName(formatAddress(targetAddress));
        return;
      }

      const nameR = await ci.resolver.name(node);
      if (!nameR.success) {
        throw new Error("Failed to get name");
      }
      const name = stripTrailingZeroBytes(nameR.returnValue);
      setDisplayName(name);
    } catch (err) {
      console.error("Error fetching name:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setDisplayName(formatAddress(targetAddress));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchName();
  }, [targetAddress]);

  return {
    displayName,
    isLoading,
    error,
    isFormattedAddress: displayName.includes("..."),
    formatAddress,
    refetch: fetchName,
  };
};
