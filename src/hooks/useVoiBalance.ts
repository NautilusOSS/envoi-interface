import { useState, useEffect } from "react";
import { WalletAccount } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";

export const useVoiBalance = (address: string | undefined, network: string) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) {
        setBalance(null);
        setLoading(false);
        return;
      }

      try {
        const { algodClient } = getAlgorandClients();
        const accInfo = await algodClient.accountInformation(address).do();
        const { amount, ["min-balance"]: minBalance } = accInfo;
        const availableBalance = Math.max(
          Number(amount) - Number(minBalance),
          0
        );
        setBalance(availableBalance / 1e6);
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [address, network]);

  return { balance, loading };
};
