import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Pagination,
  Snackbar,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import StakingContractCard from "./StakingContractCard";
import { CONTRACT, abi } from "ulujs";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { APP_SPEC as VNSStakingRegistrarSpec } from "@/clients/StakingRegistrarClient";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import {
  bigIntToUint8Array,
  namehash,
  stringToUint8Array,
} from "@/utils/namehash";
import { zeroAddress } from "@/contants/accounts";

interface StakingContract {
  appId: number;
  name: string;
  balance: number;
  stakedAmount: number;
  rewardsAvailable: number;
  contractAddress: string;
}

interface StakingModalProps {
  open: boolean;
  onClose: () => void;
}

const truncateAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getExplorerUrl = (address: string): string => {
  return `https://voiager.xyz/account/${address}`;
};

const StakingModal: React.FC<StakingModalProps> = ({ open, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [contracts, setContracts] = useState<StakingContract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { activeAccount, signTransactions } = useWallet();
  const [page, setPage] = useState(1);
  const contractsPerPage = 3;
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  useEffect(() => {
    const fetchStakingContracts = async () => {
      if (!activeAccount) {
        setContracts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch staking contracts from API
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/v1/scs/accounts?owner=${activeAccount.address}`
        );
        const data = await response.json();

        const contractData = data.accounts.map((contract) => ({
          appId: contract.contractId,
          contractAddress: contract.contractAddress,
          name: `Staking Contract ${contract.contractId}`,
          balance: Number(contract.global_total) / 1e6, // Convert from microalgos
          stakedAmount: Number(contract.global_initial) / 1e6,
          rewardsAvailable: 0, // Calculate based on your contract's logic
        }));

        const sortedContracts = contractData.sort(
          (a, b) => b.balance - a.balance
        );

        setContracts(sortedContracts);
      } catch (err) {
        console.error("Error fetching staking contracts:", err);
        setError("Failed to fetch staking contracts. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchStakingContracts();
    }
  }, [open, activeAccount]);

  const totalPages = Math.ceil(contracts.length / contractsPerPage);
  const startIndex = (page - 1) * contractsPerPage;
  const endIndex = startIndex + contractsPerPage;
  const currentContracts = contracts.slice(startIndex, endIndex);

  const handleEditName = async (name: string, contract: StakingContract) => {
    console.log({ name, contract });
    try {
      if (!activeAccount) return;
      // if reverse collection not registered
      //   register reverse collection
      // set name for reverse collection
      const vns = {
        registry: 797607,
        resolver: 797608,
        registrar: 797609,
        reverseRegistrar: 797610,
        collectionRegistrar: 846601,
        stakingRegistrar: 876578,
      };
      const { algodClient } = getAlgorandClients();
      const ci = new CONTRACT(
        vns.stakingRegistrar,
        algodClient,
        undefined,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      const ciRegistry = new CONTRACT(
        vns.registry,
        algodClient,
        undefined,
        {
          name: "VNS Registry",
          description: "VNS Registry",
          methods: VNSRegistrySpec.contract.methods,
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      const builder = {
        registrar: new CONTRACT(
          vns.stakingRegistrar,
          algodClient,
          undefined,
          {
            name: "VNS Staking Registrar",
            description: "VNS Staking Registrar",
            methods: VNSStakingRegistrarSpec.contract.methods,
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        resolver: new CONTRACT(
          vns.resolver,
          algodClient,
          undefined,
          {
            name: "VNS Public Resolver",
            description: "VNS Public Resolver",
            methods: VNSPublicResolverSpec.contract.methods,
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
      };

      // do register if contractId.collection.reverse owner is zero address
      const ownerOfR = await ciRegistry.ownerOf(
        await namehash(`${contract.contractAddress}.staking.reverse`)
      );
      if (!ownerOfR.success) {
        throw new Error("Reverse staking not registered");
      }
      const ownerOf = ownerOfR.returnValue;

      const doRegister = ownerOf == zeroAddress;

      const buildN = [];
      if (doRegister) {
        console.log("registering ");
        const txnO = (
          await builder.registrar.register(
            bigIntToUint8Array(BigInt(contract.appId)),
            activeAccount.address,
            0
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `stakingRegistrar register for ${contract.appId}.staking.reverse`
          ),
          foreignApps: [Number(contract.appId)],
          payment: 284000,
        });
      }
      {
        console.log(
          `setting name of ${contract.contractAddress}.staking.reverse to ${name}`
        );
        const txnO = (
          await builder.resolver.setName(
            await namehash(`${contract.contractAddress}.staking.reverse`),
            stringToUint8Array(name, 256)
          )
        )?.obj;
        console.log({ txnO });
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `resolver setName for ${contract.contractAddress}.staking.reverse to ${name}`
          ),
        });
      }

      ci.setFee(2000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      const customR = await ci.custom();
      if (!customR.success) {
        console.log({ customR });
        throw new Error("Failed to set name");
      }
      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );
      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      console.log({ res });
    } catch (err) {
      console.error("Error editing name:", err);
    }
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setShowCopyNotification(true);
  };

  const handleExplorerClick = (address: string) => {
    window.open(getExplorerUrl(address), "_blank");
  };

  console.log(contracts);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "background.paper",
          borderRadius: "12px",
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Staking Contracts
        </Typography>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#8B5CF6" }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : contracts.length === 0 ? (
          <Alert severity="info">
            No staking contracts found for this account.
          </Alert>
        ) : (
          <>
            <Box sx={{ display: "grid", gap: 2 }}>
              {currentContracts.map((contract: StakingContract) => (
                <StakingContractCard
                  key={contract.appId}
                  contract={contract}
                  onCopyAddress={handleCopyAddress}
                  onExplorerClick={handleExplorerClick}
                  onEditName={handleEditName}
                />
              ))}
            </Box>

            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: "#8B5CF6",
                    },
                    "& .Mui-selected": {
                      backgroundColor: "rgba(139, 92, 246, 0.1) !important",
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <Snackbar
        open={showCopyNotification}
        autoHideDuration={2000}
        onClose={() => setShowCopyNotification(false)}
        message="Address copied to clipboard"
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </Dialog>
  );
};

export default StakingModal;
