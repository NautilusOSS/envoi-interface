export const NETWORK_CONFIG = {
  mainnet: {
    indexerUrl: 'https://mainnet-idx.voi.nodely.dev',
    algodUrl: 'https://mainnet-api.voi.nodely.dev',
    contracts: {
      // Mainnet contract IDs to be added later
      vnsRegistry: 0,
      vnsResolver: 0,
      vnsRegistrar: 0,
      arc200: 0
    }
  },
  testnet: {
    indexerUrl: 'https://testnet-idx.voi.nodely.dev',
    algodUrl: 'https://testnet-api.voi.nodely.dev',
    contracts: {
      vnsRegistry: 30000,
      vnsResolver: 30001,
      vnsRegistrar: 30002,
      arc200: 20438
    }
  }
} as const;

// Helper type for network names
export type NetworkType = keyof typeof NETWORK_CONFIG;

// Helper function to get contract IDs for current network
export const getContractIds = (network: NetworkType) => {
  return NETWORK_CONFIG[network].contracts;
}; 