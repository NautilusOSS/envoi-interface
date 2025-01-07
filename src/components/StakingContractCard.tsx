import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import EditIcon from "@mui/icons-material/Edit";
import { StakingContract } from "./types"; // You'll need to move the interface to a separate file
import { getAlgorandClients } from "@/wallets";
import { ResolverService } from "@/services/resolver";
import StakingSetNameModal from "./StakingSetNameModal";

interface StakingContractCardProps {
  contract: StakingContract;
  onCopyAddress: (address: string) => void;
  onExplorerClick: (address: string) => void;
  onEditName: (name: string, contract: StakingContract) => void;
}

const StakingContractCard: React.FC<StakingContractCardProps> = ({
  contract,
  onCopyAddress,
  onExplorerClick,
  onEditName,
}) => {
  const [contractBalance, setContractBalance] = useState<number | null>(null);
  const [contractName, setContractName] = useState<string | null>(null);
  const [isSetNameModalOpen, setIsSetNameModalOpen] = useState(false);

  useEffect(() => {
    const fetchContractBalance = async () => {
      try {
        // Replace this with your actual API call or web3 method
        const { algodClient } = getAlgorandClients();
        const response = await algodClient
          .accountInformation(contract.contractAddress)
          .do();
        setContractBalance(Number(response.amount) / 1e6);
      } catch (error) {
        console.error("Error fetching contract balance:", error);
        setContractBalance(null);
      }
    };
    const fetchName = async () => {
      const node = `${contract.contractAddress}.staking.reverse`;
      const resolver = new ResolverService("mainnet");
      const name = await resolver.name(node);
      setContractName(name);
    };
    if (contract.contractAddress) {
      fetchContractBalance();
      fetchName();
    }
  }, [contract.contractAddress]);

  const truncateAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleEditName = () => {
    setIsSetNameModalOpen(true);
  };

  const handleSetNameModalClose = () => {
    setIsSetNameModalOpen(false);
  };

  return (
    <>
      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
          >
            {contractName || contract.name}
            <IconButton size="small" onClick={handleEditName}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Typography>
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Contract ID: {contract.appId}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Contract Address: {truncateAddress(contract.contractAddress)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <IconButton
                  onClick={() => onCopyAddress(contract.contractAddress)}
                  size="small"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => onExplorerClick(contract.contractAddress)}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Contract Balance:{" "}
              {contractBalance !== null
                ? `${contractBalance.toFixed(6)} VOI`
                : "Loading..."}
            </Typography>
            {/*<Typography variant="body2" color="text.secondary">
              Available Amount: {contract.rewardsAvailable.toFixed(6)} VOI
            </Typography>*/}
          </Box>
          {/*<Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              disabled={!contract.rewardsAvailable || contractBalance === null}
              sx={{
                backgroundColor: "#8B5CF6",
                "&:hover": { backgroundColor: "#7C3AED" },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(139, 92, 246, 0.3)",
                },
              }}
            >
              Stake More
            </Button>
            <Button
              variant="outlined"
              disabled={!contract.rewardsAvailable || contractBalance === null}
              sx={{
                borderColor: "#8B5CF6",
                color: "#8B5CF6",
                "&:hover": {
                  borderColor: "#7C3AED",
                  backgroundColor: "rgba(139, 92, 246, 0.04)",
                },
                "&.Mui-disabled": {
                  borderColor: "rgba(139, 92, 246, 0.3)",
                  color: "rgba(139, 92, 246, 0.3)",
                },
              }}
            >
              Claim Rewards
            </Button>
          </Box>*/}
        </CardContent>
      </Card>
      <StakingSetNameModal
        contract={contract}
        open={isSetNameModalOpen}
        onClose={handleSetNameModalClose}
        contractAddress={contract.contractAddress}
        onNameSelected={onEditName}
      />
    </>
  );
};

export default StakingContractCard;
