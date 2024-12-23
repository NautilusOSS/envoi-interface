import React from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Link,
  Divider,
  List,
  ListItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface ContractInfoModalProps {
  open: boolean;
  onClose: () => void;
  selectedNetwork: "mainnet" | "testnet";
}

const ContractInfoModal: React.FC<ContractInfoModalProps> = ({
  open,
  onClose,
  selectedNetwork,
}) => {
  const explorerBaseUrl =
    selectedNetwork === "mainnet"
      ? "https://block.voi.network/explorer"
      : "https://testnet.block.voi.network/explorer";

  const tokenExplorerBaseUrl =
    selectedNetwork === "mainnet"
      ? "https://voiager.xyz/token"
      : "https://testnet.voiager.xyz/token";

  const contracts = {
    mainnet: {
      vnsRegistry: 797607,
      vnsResolver: 797608,
      vnsRegistrar: 797609,
      vnsReverseRegistrar: 797610,
      vnsCollectionRegistrar: 846601,
      ausdc: {
        asaId: 302190,
        tokenId: 395614,
      },
      wvoi: 828295,
    },
    testnet: {
      vnsRegistry: 30000,
      vnsResolver: 30001,
      vnsRegistrar: 30002,
      vnsReverseRegistrar: 30003,
      vnsCollectionRegistrar: 0,
      ausdc: {
        asaId: 20438,
        tokenId: 20438,
      },
      wvoi: 0,
    },
  };

  const currentContracts =
    selectedNetwork === "mainnet" ? contracts.mainnet : contracts.testnet;

  const getExplorerLink = (appId: string | number) =>
    `${explorerBaseUrl}/application/${appId}/global-state`;

  const getTokenExplorerLink = (tokenId: string | number) =>
    `${tokenExplorerBaseUrl}/${tokenId}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="contract-info-modal"
      aria-describedby="contract-info-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 500 },
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "grey.500",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h6"
          component="h2"
          sx={{ mb: 2, color: "#8B5CF6" }}
        >
          About enVoi
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          enVoi is a decentralized naming service built on the Voi blockchain.
          It allows users to register and manage human-readable names that map
          to their Voi addresses, making it easier to send and receive assets on
          the network.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Contract Details
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Network:{" "}
          <strong>
            {selectedNetwork === "mainnet" ? "Voi Mainnet" : "Voi Testnet"}
          </strong>
        </Typography>

        <List sx={{ mb: 2 }}>
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              py: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              VNS Registry:{" "}
              <Link
                href={getExplorerLink(currentContracts.vnsRegistry)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.vnsRegistry}
              </Link>
            </Typography>
          </ListItem>
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              py: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              VNS Resolver:{" "}
              <Link
                href={getExplorerLink(currentContracts.vnsResolver)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.vnsResolver}
              </Link>
            </Typography>
          </ListItem>
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              py: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              VNS Registrar:{" "}
              <Link
                href={getExplorerLink(currentContracts.vnsRegistrar)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.vnsRegistrar}
              </Link>
            </Typography>
          </ListItem>
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              py: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              VNS Reverse Registrar:{" "}
              <Link
                href={getExplorerLink(currentContracts.vnsReverseRegistrar)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.vnsReverseRegistrar}
              </Link>
            </Typography>
          </ListItem>
          {/* collection registrar */}
          <ListItem>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              VNS Collection Registrar:{" "}
              <Link
                href={getExplorerLink(currentContracts.vnsCollectionRegistrar)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.vnsCollectionRegistrar}
              </Link>
            </Typography>
          </ListItem>
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              py: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Aramid USDC (aUSDC):{" "}
              <Link
                href={`https://block.voi.network/explorer/asset/${currentContracts.ausdc}/transactions`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.ausdc.asaId}
              </Link>
              {`, `}
              <Link
                href={`https://voiager.xyz/token/${currentContracts.ausdc.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.ausdc.tokenId}
              </Link>
            </Typography>
          </ListItem>
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              py: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Wrapped VOI (en VOI):{" "}
              <Link
                href={`https://voiager.xyz/token/${currentContracts.wvoi}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "#8B5CF6" }}
              >
                {currentContracts.wvoi}
              </Link>
            </Typography>
          </ListItem>
        </List>

        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          For more information and documentation, visit our{" "}
          <Link
            href="https://docs.voi.network"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "#8B5CF6" }}
          >
            documentation
          </Link>
          .
        </Typography>
      </Box>
    </Modal>
  );
};

export default ContractInfoModal;
