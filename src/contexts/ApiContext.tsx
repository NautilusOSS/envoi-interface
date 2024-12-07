const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedNetwork } = useNetworkState(); // You might need to create this hook
  const endpoints = NETWORK_CONFIG[selectedNetwork];
  
  const apiClient = useMemo(() => {
    return createApiClient({
      algodUrl: endpoints.algodUrl,
      indexerUrl: endpoints.indexerUrl,
    });
  }, [selectedNetwork]);

  return (
    <ApiContext.Provider value={apiClient}>
      {children}
    </ApiContext.Provider>
  );
}; 