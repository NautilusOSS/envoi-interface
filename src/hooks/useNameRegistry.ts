import { useCallback, useMemo } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { useQuery } from "@tanstack/react-query";
import { RegistryService } from "@/services/registry";
import { RegistrarService } from "@/services/registrar";
import { ResolverService } from "@/services/resolver";
import { namehash, uint8ArrayToBigInt } from "@/utils/namehash";
import { zeroAddress } from "@/contants/accounts";

export interface NameInfo {
  owner: string | null;
  expiry: Date | null;
  resolvedName: string | null;
  avatar: string | null;
  twitter: string | null;
  github: string | null;
  location: string | null;
  url: string | null;
}

const fetchNameInfo = async (name: string | undefined): Promise<NameInfo> => {
  if (!name) {
    return {
      owner: null,
      expiry: null,
      resolvedName: null,
      avatar: null,
      twitter: null,
      github: null,
      location: null,
      url: null,
    };
  }

  const registry = new RegistryService("mainnet");
  const registrar = new RegistrarService("mainnet");
  const resolver = new ResolverService("mainnet");

  const nameHash = await namehash(name);
  const tokenId = uint8ArrayToBigInt(nameHash);

  // Fetch owner
  const owner = await registrar.ownerOf(tokenId);
  const finalOwner = owner !== zeroAddress ? owner : await registry.ownerOf(name);

  // Fetch expiry
  const expiryTimestamp = await registrar.expiration(tokenId);
  const expiry = expiryTimestamp ? new Date(Number(expiryTimestamp) * 1000) : null;

  // Fetch resolver data
  const [resolvedName, avatar, twitter, github, location, url] = await Promise.all([
    resolver.name(name),
    resolver.text(name, "avatar"),
    resolver.text(name, "com.twitter"),
    resolver.text(name, "com.github"),
    resolver.text(name, "location"),
    resolver.text(name, "url"),
  ]);

  return {
    owner: finalOwner,
    expiry,
    resolvedName,
    avatar,
    twitter,
    github,
    location,
    url,
  };
};

export const useNameRegistry = (name: string | undefined) => {
  const { activeAccount } = useWallet();

  const {
    data: nameInfo = {
      owner: null,
      expiry: null,
      resolvedName: null,
      avatar: null,
      twitter: null,
      github: null,
      location: null,
      url: null,
    },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["nameInfo", name],
    queryFn: () => fetchNameInfo(name),
    enabled: !!name,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const isOwner = useCallback(() => {
    if (!activeAccount || !nameInfo.owner) return false;
    return activeAccount.address === nameInfo.owner;
  }, [activeAccount, nameInfo.owner]);

  const getOwner = useCallback(() => {
    return nameInfo.owner;
  }, [nameInfo.owner]);

  const getExpiry = useCallback(() => {
    return nameInfo.expiry;
  }, [nameInfo.expiry]);

  const getResolvedName = useCallback(() => {
    return nameInfo.resolvedName;
  }, [nameInfo.resolvedName]);

  const getAvatar = useCallback(() => {
    return nameInfo.avatar;
  }, [nameInfo.avatar]);

  const getTwitter = useCallback(() => {
    return nameInfo.twitter;
  }, [nameInfo.twitter]);

  const getGithub = useCallback(() => {
    return nameInfo.github;
  }, [nameInfo.github]);

  const getLocation = useCallback(() => {
    return nameInfo.location;
  }, [nameInfo.location]);

  const getUrl = useCallback(() => {
    return nameInfo.url;
  }, [nameInfo.url]);

  return {
    // State
    nameInfo,
    isLoading,
    error: error as Error | null,

    // Getters
    isOwner,
    getOwner,
    getExpiry,
    getResolvedName,
    getAvatar,
    getTwitter,
    getGithub,
    getLocation,
    getUrl,

    // Actions
    refetch,
  };
}; 