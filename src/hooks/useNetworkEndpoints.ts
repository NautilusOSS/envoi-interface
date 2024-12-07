export const useNetworkEndpoints = () => {
  const { selectedNetwork } = useContext(NetworkContext); // You'll need to create this context
  return NETWORK_CONFIG[selectedNetwork];
}; 