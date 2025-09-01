import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TimerIcon from "@mui/icons-material/Timer";
import "./ProfilePage.scss";
import { RegistryService } from "@/services/registry";
import { useWallet } from "@txnlab/use-wallet-react";
// import {  } from "@/constants/fees";
import {
  Snackbar,
  Alert,
  Avatar,
  Modal,
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@/contexts/ThemeContext";
import { RegistrarService } from "@/services/registrar";
import {
  namehash,
  stringToUint8Array,
  uint8ArrayToBigInt,
} from "@/utils/namehash";
import { ResolverService } from "@/services/resolver";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { CONTRACT, abi } from "ulujs";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import DeleteIcon from "@mui/icons-material/Delete";
import TwitterIcon from "@mui/icons-material/Twitter";
import GitHubIcon from "@mui/icons-material/GitHub";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import EmailIcon from "@mui/icons-material/Email";
import WebIcon from "@mui/icons-material/Web";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import LinkIcon from "@mui/icons-material/Link";
import { ARC72Service } from "@/services/arc72";
import { zeroAddress } from "@/contants/accounts";
import { useSnackbar } from "notistack";
import { FastForwardIcon, SendIcon } from "lucide-react";
import CloseIcon from "@mui/icons-material/Close";
import { getAlgorandClients } from "@/wallets";
import algosdk from "algosdk";
import { APP_SPEC as VNSRegistrarSpec } from "@/clients/VNSRegistrarClient";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { TRANSACTION_FEES } from "@/constants/fees";
import { useNameRegistration } from "@/hooks/useNameRegistration";
import { useNameRegistry } from "@/hooks/useNameRegistry";
import { VnsRegistrarClient } from "@/clients/VNSRegistrarClient";

type NetworkType = "mainnet" | "testnet";

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  properties: Record<string, string>;
}

interface NFTToken {
  contractId: number;
  tokenId: string;
  metadata: string;
  collectionName: string;
}

interface SelectNFTModalProps {
  onClose: () => void;
  selectedNftId: string | null;
  setSelectedNftId: (id: string | null) => void;
}

const SelectNFTModal: React.FC<SelectNFTModalProps> = ({
  onClose,
  selectedNftId,
  setSelectedNftId,
}) => {
  return (
    <Button
      onClick={() => {
        onClose();
        setSelectedNftId(null);
      }}
      variant="outlined"
    >
      Cancel
    </Button>
  );
};

interface ProfileField {
  key: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}

const AVAILABLE_FIELDS: ProfileField[] = [
  {
    key: "com.twitter",
    label: "Twitter",
    icon: <TwitterIcon />,
    placeholder: "Enter your Twitter handle",
  },
  {
    key: "com.github",
    label: "GitHub",
    icon: <GitHubIcon />,
    placeholder: "Enter your GitHub username",
  },
  /*
  {
    key: "email",
    label: "Email",
    icon: <EmailIcon />,
    placeholder: "Enter your email address",
  },
  */
  {
    key: "url",
    label: "Website",
    icon: <WebIcon />,
    placeholder: "Enter your website URL",
  },
  {
    key: "location",
    label: "Location",
    icon: <LocationOnIcon />,
    placeholder: "Enter your location",
  },
];

interface ExtendModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  onConfirm: (duration: string) => void;
}

const ExtendModal: React.FC<ExtendModalProps> = ({
  open,
  onClose,
  name,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const { calculateTotalCost, setDuration, duration, getPriceBreakdownJSX } =
    useNameRegistration({ initialName: name });
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        className="edit-modal"
        sx={{ display: "flex", gap: 2, mb: 2, flexDirection: "column" }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: "text.secondary",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h6"
          component="h2"
          sx={{
            mb: 3,
            textAlign: "center",
            fontSize: "1.25rem",
            fontWeight: 500,
            color: "#111827",
          }}
        >
          Extend {name}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            mb: 1,
            "& .MuiButton-root": {
              minWidth: "40px",
              width: "40px",
              height: "40px",
              p: 0,
              borderRadius: "50%",
              border: "2px solid",
              borderColor: "#E5E7EB",
              color: "#374151",
              "&:hover": {
                borderColor: "#D1D5DB",
                bgcolor: "#F9FAFB",
              },
            },
          }}
        >
          <Button
            variant="outlined"
            onClick={() =>
              setDuration((prev) =>
                parseInt(prev) > 1 ? String(parseInt(prev) - 1) : "1"
              )
            }
          >
            -
          </Button>
          <Typography
            variant="h4"
            component="span"
            sx={{
              color: "#6366F1",
              fontWeight: 500,
              minWidth: "120px",
              textAlign: "center",
              fontSize: "2rem",
            }}
          >
            {duration} year{parseInt(duration) !== 1 ? "s" : ""}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setDuration((prev) => String(parseInt(prev) + 1))}
          >
            +
          </Button>
        </Box>

        <Box
          sx={{
            p: 2,
            bgcolor: theme.palette.mode === "light" ? "#F9FAFB" : "#1F2937",
            borderRadius: 1,
            border: "1px solid",
            borderColor: theme.palette.mode === "light" ? "#E5E7EB" : "#374151",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Extension Cost
            </Typography>
            <Tooltip title={getPriceBreakdownJSX()} arrow>
              <IconButton size="small">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="h6" color="text.primary" align="center">
            {calculateTotalCost().namePrice.toLocaleString()} VOI
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            display="block"
          >
            Transaction Fees: {calculateTotalCost().fees.toLocaleString()} VOI
          </Typography>
          <Typography
            variant="body2"
            color="text.primary"
            align="center"
            sx={{ mt: 1, fontWeight: "bold" }}
          >
            Total: {calculateTotalCost(name).total.toLocaleString()} VOI
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{
              bgcolor: "grey.50",
              border: "none",
              color: "text.primary",
              "&:hover": {
                bgcolor: "grey.100",
                border: "none",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => onConfirm(duration)}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            Next
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

interface ConfirmExtendModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  duration: string;
  onConfirm: () => void;
}

const ConfirmExtendModal: React.FC<ConfirmExtendModalProps> = ({
  open,
  onClose,
  name,
  duration,
  onConfirm,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const {
    calculateTotalCost,
    getPriceBreakdownJSX,
    paymentAssetSymbol,
    duration: finalDuration,
    setDuration,
    handleConfirmRenewVOI,
  } = useNameRegistration({
    initialName: name,
    initialDuration: parseInt(duration),
  });

  const { getExpiry } = useNameRegistry(name);

  useEffect(() => {
    setDuration(parseInt(duration));
  }, [duration]);

  const expiryDate = useMemo(() => {
    const expiry = getExpiry();
    if (!expiry) return null;
    const newExpiry = new Date(expiry);
    newExpiry.setFullYear(expiry.getFullYear() + parseInt(duration));
    return newExpiry;
  }, [duration]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await handleConfirmRenewVOI();
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box className="edit-modal">
        <h2 className="text-2xl font-bold">Confirm Details</h2>
        <Typography sx={{ mb: 3 }}>
          Double check these details before confirming in your wallet.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">Name</Typography>
            <Typography>{name}</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">Action</Typography>
            <Typography>Extend registration</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">Duration</Typography>
            <Box sx={{ textAlign: "right" }}>
              <Typography>
                {duration} year{parseInt(duration) !== 1 ? "s" : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                New expiry:{" "}
                {expiryDate?.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">Cost</Typography>
            <Typography>
              {calculateTotalCost().namePrice.toLocaleString()}{" "}
              {paymentAssetSymbol} +{" "}
              {calculateTotalCost().fees.toLocaleString()} VOI
              <Tooltip title={getPriceBreakdownJSX()} arrow>
                <IconButton size="small">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            disabled={isConfirming}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleConfirm}
            disabled={isConfirming}
            sx={{ flex: 1 }}
          >
            {isConfirming ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Signing transaction...
              </Box>
            ) : (
              "Confirm"
            )}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  onConfirm: (newOwner: string) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({
  open,
  onClose,
  name,
  onConfirm,
}) => {
  const [newOwner, setNewOwner] = useState("");
  const [isValidAddress, setIsValidAddress] = useState(false);

  const validateAddress = (address: string) => {
    try {
      algosdk.decodeAddress(address);
      setIsValidAddress(true);
    } catch {
      setIsValidAddress(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setNewOwner(address);
    validateAddress(address);
  };

  const handleConfirm = () => {
    if (isValidAddress && newOwner.trim()) {
      onConfirm(newOwner.trim());
      setNewOwner("");
      setIsValidAddress(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box className="edit-modal">
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: "text.secondary",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h6"
          component="h2"
          sx={{
            mb: 3,
            textAlign: "center",
            fontSize: "1.25rem",
            fontWeight: 500,
            color: "#111827",
          }}
        >
          Transfer {name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, textAlign: "center" }}
        >
          Transfer ownership of this name to another address. This action cannot be undone.
        </Typography>

        <TextField
          fullWidth
          label="New Owner Address"
          placeholder="Enter Algorand address"
          value={newOwner}
          onChange={handleAddressChange}
          error={newOwner.length > 0 && !isValidAddress}
          helperText={
            newOwner.length > 0 && !isValidAddress
              ? "Please enter a valid Algorand address"
              : ""
          }
          sx={{ mb: 3 }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{
              bgcolor: "grey.50",
              border: "none",
              color: "text.primary",
              "&:hover": {
                bgcolor: "grey.100",
                border: "none",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleConfirm}
            disabled={!isValidAddress || !newOwner.trim()}
            sx={{
              bgcolor: "error.main",
              color: "white",
              "&:hover": {
                bgcolor: "error.dark",
              },
              "&:disabled": {
                bgcolor: "grey.300",
                color: "grey.500",
              },
            }}
          >
            Transfer
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

interface ConfirmTransferModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  newOwner: string;
  currentOwner: string;
  onConfirm: () => void;
}

const ConfirmTransferModal: React.FC<ConfirmTransferModalProps> = ({
  open,
  onClose,
  name,
  newOwner,
  currentOwner,
  onConfirm,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box className="edit-modal">
        <h2 className="text-2xl font-bold">Confirm Transfer</h2>
        <Typography sx={{ mb: 3, color: "error.main" }}>
          ⚠️ Warning: This action cannot be undone!
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">Name</Typography>
            <Typography>{name}</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">Current Owner</Typography>
            <Typography>{currentOwner}</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">New Owner</Typography>
            <Typography>{newOwner}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            disabled={isConfirming}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleConfirm}
            disabled={isConfirming}
            sx={{ 
              flex: 1,
              bgcolor: "error.main",
              "&:hover": {
                bgcolor: "error.dark",
              },
            }}
          >
            {isConfirming ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Transferring...
              </Box>
            ) : (
              "Confirm Transfer"
            )}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

const ProfilePage: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const { name } = useParams<{ name: string }>();
  const { theme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const selectedNetwork: NetworkType =
    (localStorage.getItem("selectedNetwork") as NetworkType) || "mainnet";
  const explorerBaseUrl =
    selectedNetwork === "mainnet"
      ? "https://block.voi.network/explorer"
      : "https://testnet.block.voi.network/explorer";

  const [openNotification, setOpenNotification] = React.useState(false);
  const [owner, setOwner] = React.useState<string | null>(null);
  const [expiry, setExpiry] = React.useState<Date | null>(null);
  const [avatarText, setAvatarText] = React.useState<string | null>(null);
  const [twitter, setTwitter] = React.useState<string | null>(null);
  const [newTwitter, setNewTwitter] = React.useState<string | null>(null);
  const [github, setGithub] = React.useState<string | null>(null);
  const [newGithub, setNewGithub] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<string | null>(null);
  const [newLocation, setNewLocation] = React.useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = React.useState(false);
  const [isNftModalOpen, setIsNftModalOpen] = React.useState(false);
  const [nfts, setNfts] = React.useState<NFTToken[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedNftId, setSelectedNftId] = useState<string | null>(null);
  const [showNftModal, setShowNftModal] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isPendingTx, setIsPendingTx] = useState(false);
  const [isFieldCatalogOpen, setIsFieldCatalogOpen] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [url, setUrl] = React.useState<string | null>(null);
  const [newUrl, setNewUrl] = React.useState<string | null>(null);
  const [resolvedName, setResolvedName] = React.useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isConfirmExtendModalOpen, setIsConfirmExtendModalOpen] =
    useState(false);
  const [selectedDuration, setSelectedDuration] = useState("1");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isConfirmTransferModalOpen, setIsConfirmTransferModalOpen] =
    useState(false);
  const [newOwnerForTransfer, setNewOwnerForTransfer] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setOpenNotification(true);
  };

  const handleCloseNotification = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenNotification(false);
  };

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
    setNewTwitter(twitter);
    setNewGithub(github);
    setNewLocation(location);
    setNewUrl(url);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setNewTwitter(null);
    setNewGithub(null);
    setNewLocation(null);
    setNewUrl(null);
  };

  const handleAvatarClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowAvatarMenu(!showAvatarMenu);
  };

  const handleOpenNftModal = () => {
    setIsNftModalOpen(true);
    setShowAvatarMenu(false);
  };

  const handleCloseNftModal = () => setIsNftModalOpen(false);

  const handleSelectNft = () => {
    // TODO: Add logic to handle the selected NFT
    handleCloseNftModal();
  };

  const fetchNFTs = async (address: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        //`https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?owner=${address}&include=all`
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/nft-indexer/v1/tokens?owner=${address}&include=all`
      );
      const data = await response.json();
      setNfts(data.tokens);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (owner) {
      fetchNFTs(owner);
    }
  }, [isNftModalOpen, owner]);

  useEffect(() => {
    if (!activeAccount) return;
    (async () => {
      const node = await namehash(name || "");
      const tokenId = uint8ArrayToBigInt(node);
      const arc72 = new ARC72Service("mainnet", activeAccount.address, 797609);
      const owner = await arc72.ownerOf(tokenId);
      setIsOwner(owner === activeAccount.address);
    })();
  }, [name, activeAccount]);

  useEffect(() => {
    const registry = new RegistryService("mainnet");
    const registrar = new RegistrarService("mainnet");
    const resolver = new ResolverService("mainnet");

    namehash(name || "").then((nameHash) => {
      const tokenId = uint8ArrayToBigInt(nameHash);
      registrar.expiration(tokenId).then((expiryTimestamp) => {
        const expiryTimestampNumber = Number(expiryTimestamp);
        //if (expiryTimestampNumber) {
        setExpiry(new Date(expiryTimestampNumber * 1000));
        //}
      });
      registrar.ownerOf(tokenId).then((owner) => {
        if (owner != zeroAddress) {
          setOwner(owner);
        } else {
          registry.ownerOf(name || "").then((owner) => {
            setOwner(owner);
          });
        }
      });
    });
    resolver.name(name || "").then((resolvedName: string | null) => {
      setResolvedName(resolvedName);
    });
    resolver.text(name || "", "avatar").then((avatar: string | null) => {
      setAvatarText(avatar);
    });
    resolver.text(name || "", "com.twitter").then((twitter: string | null) => {
      setTwitter(twitter);
    });
    resolver.text(name || "", "com.github").then((github: string | null) => {
      setGithub(github);
    });
    resolver.text(name || "", "location").then((location: string | null) => {
      setLocation(location);
    });
    resolver.text(name || "", "url").then((url: string | null) => {
      setUrl(url);
    });
  }, [name]);

  const formatExpiry = (date: Date | null) => {
    if (!date) return "Loading...";

    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "Expired";
    } else if (diffDays === 0) {
      return "Expires today";
    } else if (diffDays === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  const filteredNfts = nfts.filter((nft) => {
    try {
      const metadata: NFTMetadata = JSON.parse(nft.metadata);
      if (nft.contractId === 797609 || nft.contractId === 797610) {
        return false;
      }
      return (
        metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.collectionName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } catch (e) {
      return false;
    }
  });

  const handleNftSelect = (nft: NFTToken) => {
    setSelectedNftId(`nft-${nft.contractId}-${nft.tokenId}`);
    const metadata: NFTMetadata = JSON.parse(nft.metadata);
    const imageUrl = metadata.image.startsWith("ipfs://")
      ? `https://ipfs.io/ipfs/${metadata.image.replace("ipfs://", "")}`
      : metadata.image;
    setProfileImage(imageUrl);
    setIsNftModalOpen(false);
  };

  const handleSelectConfirm = () => {
    if (selectedNftId) {
      const selectedNft = nfts.find(
        (nft) => `nft-${nft.contractId}-${nft.tokenId}` === selectedNftId
      );
      if (selectedNft) {
        try {
          const metadata: NFTMetadata = JSON.parse(selectedNft.metadata);
          const imageUrl = metadata.image.startsWith("ipfs://")
            ? `https://ipfs.io/ipfs/${metadata.image.replace("ipfs://", "")}`
            : metadata.image;
          setProfileImage(imageUrl);
          setSelectedNftId(null); // Reset selection
        } catch (e) {
          console.error("Error parsing NFT metadata:", e);
        }
      }
    }
    setShowNftModal(false);
  };

  const handleSave = async () => {
    setIsPendingTx(true);
    try {
      if (!activeAccount) return;
      const resolver = new ResolverService("mainnet", activeAccount.address);
      const registrar = new RegistrarService("mainnet", activeAccount.address);
      resolver.setMode("builder");
      registrar.setMode("builder");
      console.log("Building txns...");
      const doReclaim = owner !== activeAccount.address;
      const buildN = [];
      if (doReclaim && name) {
        const label = name.split(".")[0];
        const reclaimR: any = await registrar.reclaim(label);
        buildN.push(reclaimR);
      }
      let avatarUpdated = false;
      if (profileImage !== avatarText) {
        if (profileImage) {
          const setTextR: any = await resolver.setText(
            name,
            "avatar",
            profileImage
          );
          buildN.push(setTextR);
          avatarUpdated = true;
        }
      }
      let twitterUpdated = false;
      if (twitter !== newTwitter) {
        const setTextR: any = await resolver.setText(
          name,
          "com.twitter",
          newTwitter || ""
        );
        buildN.push(setTextR);
        twitterUpdated = true;
      }
      let githubUpdated = false;
      if (github !== newGithub) {
        const setTextR: any = await resolver.setText(
          name,
          "com.github",
          newGithub || ""
        );
        buildN.push(setTextR);
        githubUpdated = true;
      }

      let urlUpdated = false;
      if (url !== newUrl) {
        const setTextR: any = await resolver.setText(name, "url", newUrl || "");
        buildN.push(setTextR);
        urlUpdated = true;
      }

      let locationUpdated = false;
      if (location !== newLocation) {
        const setTextR: any = await resolver.setText(
          name,
          "location",
          newLocation || ""
        );
        buildN.push(setTextR);
        locationUpdated = true;
      }

      console.log({ buildN });

      const ci = new CONTRACT(
        resolver.getId(),
        resolver.getClient(),
        resolver.getIndexerClient(),
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      ci.setFee(2000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN.map((n) => n.obj));
      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        throw new Error("Failed to set profile");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      const res = await resolver
        .getClient()
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      // After successful transaction, refresh the avatar
      if (avatarUpdated) {
        let newAvatarText = await resolver.text(name || "", "avatar");
        do {
          if (newAvatarText !== avatarText) {
            break;
          }
          newAvatarText = await resolver.text(name || "", "avatar");
        } while (1);
        setAvatarText(newAvatarText);
      }

      if (twitterUpdated) {
        let newTwitterText = await resolver.text(name || "", "com.twitter");
        do {
          if (newTwitterText !== twitter) {
            break;
          }
          newTwitterText = await resolver.text(name || "", "com.twitter");
        } while (1);
        setTwitter(newTwitterText);
      }

      if (githubUpdated) {
        let newGithubText = await resolver.text(name || "", "com.github");
        do {
          if (newGithubText !== github) {
            break;
          }
          newGithubText = await resolver.text(name || "", "com.github");
        } while (1);
        setGithub(newGithubText);
      }

      if (urlUpdated) {
        let newUrlText = await resolver.text(name || "", "url");
        do {
          if (newUrlText !== url) {
            break;
          }
          newUrlText = await resolver.text(name || "", "url");
        } while (1);
        setUrl(newUrlText);
      }

      if (locationUpdated) {
        let newLocationText = await resolver.text(name || "", "location");
        do {
          if (newLocationText !== location) {
            break;
          }
          newLocationText = await resolver.text(name || "", "location");
        } while (1);
        setLocation(newLocationText);
      }

      setIsPendingTx(false);
      setIsEditModalOpen(false);
    } catch (e) {
      console.error("Error saving profile:", e);
      setIsPendingTx(false);
    }
  };

  const handleOpenFieldCatalog = () => {
    setIsFieldCatalogOpen(true);
  };

  const handleCloseFieldCatalog = () => {
    setIsFieldCatalogOpen(false);
  };

  const handleAddField = (field: ProfileField) => {
    switch (field.key) {
      case "com.twitter":
        if (!newTwitter) setNewTwitter(" ");
        break;
      case "com.github":
        if (!newGithub) setNewGithub(" ");
        break;
      case "location":
        if (!newLocation) setNewLocation(" ");
        break;
      case "url":
        if (!newUrl) setNewUrl(" ");
        break;
      // Add more cases for other fields as needed
    }
    handleCloseFieldCatalog();
  };

  const filteredFields = AVAILABLE_FIELDS.filter((field) =>
    field.label.toLowerCase().includes(fieldSearchQuery.toLowerCase())
  );

  const handleExtend = async () => {
    setIsExtendModalOpen(true);
  };

  const handleExtendConfirm = (duration: string) => {
    setSelectedDuration(duration);
    setIsExtendModalOpen(false);
    setIsConfirmExtendModalOpen(true);
  };

  const {} = useNameRegistration({
    initialName: name,
    initialDuration: parseInt(selectedDuration),
  });

  const handleFinalExtendConfirm = async () => {
    setIsPendingTx(true);
    try {
      if (!activeAccount) {
        enqueueSnackbar("Please connect your wallet to extend a name", {
          variant: "error",
        });
        return;
      }

      const { algodClient, indexerClient } = getAlgorandClients();

      const vns = {
        registrar: 797609,
        resolver: 797608,
      };

      const wVOI = {
        tokenId: 828295, // en Voi
        decimals: 6,
      };

      const ci = new CONTRACT(
        vns.registrar,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      const builder = {
        arc200: new CONTRACT(
          wVOI.tokenId,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        registrar: new CONTRACT(
          vns.registrar,
          algodClient,
          indexerClient,
          {
            name: "registrar",
            description: "Registrar",
            methods: VNSRegistrarSpec.contract.methods,
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

      const paymentAmount = 1;

      let customR;
      for (const p0 of [0, 28500]) {
        const buildN = [];

        // Create wVOI Balance for user if needed
        if (p0 > 0) {
          const txnO = (
            await builder.arc200.createBalanceBox(activeAccount.address)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: p0,
            note: new TextEncoder().encode(
              `envoi createBalanceBox ${paymentAmount} VOI for ${name}.voi extension`
            ),
          });
        }

        // Deposit VOI (NET -> ARC200)
        {
          const txnO = (
            await builder.arc200.deposit(paymentAmount * 10 ** wVOI.decimals)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: paymentAmount * 10 ** wVOI.decimals,
            note: new TextEncoder().encode(
              `envoi deposit ${paymentAmount} VOI for ${name}.voi extension`
            ),
          });
        }

        // Approve spending
        {
          const paramSpender = algosdk.getApplicationAddress(vns.registrar);
          const paramAmount = paymentAmount * 10 ** wVOI.decimals;
          const txnO = (
            await builder.arc200.arc200_approve(paramSpender, paramAmount)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 28501,
            note: new TextEncoder().encode(
              `envoi arc200_approve ${paymentAmount} VOI spending for ${name}.voi extension`
            ),
          });
        }

        // Extend name
        {
          const paramName = stringToUint8Array(name, 32);
          const paramDuration = Number(selectedDuration) * 365 * 24 * 60 * 60; // Convert years to seconds
          const txnO = (await builder.registrar.renew())?.obj;
          buildN.push({
            ...txnO,
            payment: 336700,
            note: new TextEncoder().encode(
              `envoi registrar extend ${name}.voi for ${selectedDuration} years`
            ),
          });
        }

        ci.setFee(15000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);

        customR = await ci.custom();

        if (customR.success) {
          break;
        }
      }

      if (!customR.success) {
        throw new Error("Failed to extend name");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      // Refresh expiry date after successful extension
      const registrar = new RegistrarService("mainnet");
      const node = await namehash(name || "");
      const tokenId = uint8ArrayToBigInt(node);
      const newExpiryTimestamp = await registrar.expiration(tokenId);
      setExpiry(new Date(Number(newExpiryTimestamp) * 1000));

      enqueueSnackbar("Name extended successfully!", { variant: "success" });
      setIsConfirmExtendModalOpen(false);
    } catch (error) {
      console.error("Error extending name:", error);
      enqueueSnackbar("Failed to extend name. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsPendingTx(false);
    }
  };

  const handleOpenTransferModal = () => {
    setIsTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    setNewOwnerForTransfer(null);
  };

  const handleConfirmTransfer = async (newOwner: string) => {
    setNewOwnerForTransfer(newOwner);
    setIsConfirmTransferModalOpen(true);
    setIsTransferModalOpen(false);
  };

  const handleFinalTransferConfirm = async () => {
    setIsPendingTx(true);
    try {
      if (!activeAccount) {
        enqueueSnackbar("Please connect your wallet to transfer a name", {
          variant: "error",
        });
        return;
      }

      const { algodClient, indexerClient } = getAlgorandClients();

      const vns = {
        registrar: 797609,
      };

      const ci = new CONTRACT(
        vns.registrar,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      const builder = {
        registrar: new CONTRACT(
          vns.registrar,
          algodClient,
          indexerClient,
          {
            name: "registrar",
            description: "Registrar",
            methods: VNSRegistrarSpec.contract.methods,
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

      const buildN = [];

      // Get the token ID for the name
      const node = await namehash(name || "");
      const tokenId = uint8ArrayToBigInt(node);

      // Transfer the name
      const txnO = await builder.registrar.arc72_transferFrom(
        activeAccount.address,
        newOwnerForTransfer || "",
        tokenId
      );
      buildN.push({
        ...txnO.obj,
        payment: 28500,
        note: new TextEncoder().encode(
          `envoi arc72_transferFrom ${name}.voi from ${activeAccount.address} to ${newOwnerForTransfer}`
        ),
      });

      ci.setFee(2000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);

      const customR = await ci.custom();

      if (!customR.success) {
        throw new Error("Failed to transfer name");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      // Refresh owner after successful transfer
      const registrar = new RegistrarService("mainnet");
      const newOwner = await registrar.ownerOf(tokenId);
      setOwner(newOwner);

      enqueueSnackbar("Name transferred successfully!", { variant: "success" });
      setIsConfirmTransferModalOpen(false);
    } catch (error) {
      console.error("Error transferring name:", error);
      enqueueSnackbar("Failed to transfer name. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsPendingTx(false);
    }
  };

  return (
    <div
      className="profile-container"
      style={{ minHeight: "100vh", overflowY: "auto", paddingBottom: "4rem" }}
    >
      <div className="profile-banner">
        <div className="banner-content">
          <Avatar
            sx={{ width: 120, height: 120, bgcolor: "#3B82F6" }}
            className="profile-avatar"
            src={avatarText || undefined}
          >
            {name?.charAt(0).toUpperCase()}
          </Avatar>
          <h1 className="profile-name">{name}</h1>
          {isOwner && (
            <div style={{ 
              position: "absolute", 
              right: "1rem", 
              top: "1rem", 
              display: "flex", 
              gap: "0.5rem" 
            }}>
              <Button
                variant="contained"
                onClick={handleExtend}
                sx={{
                  bgcolor: "white",
                  color: "#8B5CF6",
                  "&:hover": {
                    bgcolor: "#F5F3FF",
                  },
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                Extend
                <FastForwardIcon />
              </Button>
              <Button
                variant="contained"
                onClick={handleOpenTransferModal}
                sx={{
                  bgcolor: "white",
                  color: "#EF4444",
                  "&:hover": {
                    bgcolor: "#FEF2F2",
                  },
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                Transfer
                <SendIcon />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="profile-details">
        <div className="details-card">
          <div className="card-header">
            <h2>Profile Details</h2>
          </div>

          {resolvedName ? (
            <div className="detail-row">
              <div className="detail-icon">
                <TimerIcon />
              </div>
              <div className="detail-content">
                <label>Name</label>
                <div className="detail-value">{resolvedName}</div>
              </div>
            </div>
          ) : null}

          <div className="detail-row">
            <div className="detail-icon">
              <AccountBalanceWalletIcon />
            </div>
            <div className="detail-content">
              <label>Owner</label>
              <div className="detail-value">
                <span className="address">{owner || "Loading..."}</span>
                <button
                  className="copy-button"
                  onClick={() => handleCopy(owner || "")}
                >
                  <ContentCopyIcon />
                </button>
                <a
                  href={`${explorerBaseUrl}/address/${owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  <LaunchIcon />
                </a>
              </div>
            </div>
          </div>

          {expiry && new Date(expiry).getTime() > 0 ? (
            <div className="detail-row">
              <div className="detail-icon">
                <TimerIcon />
              </div>
              <div className="detail-content">
                <label>Expiry</label>
                <div className="detail-value">{formatExpiry(expiry)}</div>
              </div>
            </div>
          ) : null}

          {twitter && (
            <div className="detail-row">
              <div className="detail-icon">
                <TwitterIcon />
              </div>
              <div className="detail-content">
                <label>Twitter</label>
                <div className="detail-value">
                  <a
                    href={`https://twitter.com/${twitter.replace(" ", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="twitter-link"
                  >
                    @{twitter.replace(" ", "")}
                  </a>
                </div>
              </div>
            </div>
          )}

          {github && (
            <div className="detail-row">
              <div className="detail-icon">
                <GitHubIcon />
              </div>
              <div className="detail-content">
                <label>GitHub</label>
                <div className="detail-value">
                  <a
                    href={`https://github.com/${github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="github-link"
                  >
                    @{github}
                  </a>
                </div>
              </div>
            </div>
          )}

          {url && (
            <div className="detail-row">
              <div className="detail-icon">
                <LinkIcon />
              </div>
              <div className="detail-content">
                <label>URL</label>
                <div className="detail-value">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="url-link"
                  >
                    {url.replace("https://", "")}
                  </a>
                </div>
              </div>
            </div>
          )}

          {location && (
            <div className="detail-row">
              <div className="detail-icon">
                <LocationOnIcon />
              </div>
              <div className="detail-content">
                <label>Location</label>
                <div className="detail-value">{location}</div>
              </div>
            </div>
          )}

          <div className="detail-divider">
            {isOwner && (
              <button
                className="edit-profile-button"
                onClick={handleOpenEditModal}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        aria-labelledby="edit-profile-modal"
      >
        <Box className="edit-modal">
          <h2>Edit your profile</h2>

          <div className="avatar-edit-container" onClick={handleAvatarClick}>
            <Avatar
              sx={{ width: 120, height: 120, bgcolor: "#3B82F6" }}
              src={profileImage || avatarText || undefined}
            >
              {name?.charAt(0).toUpperCase()}
            </Avatar>
            <div className="avatar-overlay">
              <CameraAltIcon />
            </div>
            {showAvatarMenu && (
              <div className="avatar-menu">
                <button className="menu-item" onClick={handleOpenNftModal}>
                  <span>Select NFT</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-fields-container">
            {newTwitter && (
              <div
                className="field-wrapper"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <TextField
                  fullWidth
                  id="twitter"
                  label="Twitter"
                  placeholder="Enter your Twitter handle"
                  variant="outlined"
                  margin="normal"
                  value={newTwitter || ""}
                  onChange={e => setNewTwitter((e.target.value.includes("/") ? e.target.value.replace(/\/+$/, "").split("/").pop() : e.target.value.replace(/^@/, "")))}
                  InputLabelProps={{
                    shrink: true,
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                  }}
                  InputProps={{
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                    },
                  }}
                />
                <Button
                  sx={{ minWidth: "auto", height: "56px" }}
                  onClick={() => {
                    setNewTwitter("");
                  }}
                >
                  <DeleteIcon />
                </Button>
              </div>
            )}

            {newGithub && (
              <div
                className="field-wrapper"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <TextField
                  fullWidth
                  id="github"
                  label="GitHub"
                  placeholder="Enter your GitHub username"
                  variant="outlined"
                  margin="normal"
                  value={newGithub || ""}
                  onChange={(e) => setNewGithub(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                  }}
                  InputProps={{
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                    },
                  }}
                />
                <Button
                  sx={{ minWidth: "auto", height: "56px" }}
                  onClick={() => {
                    setNewGithub("");
                  }}
                >
                  <DeleteIcon />
                </Button>
              </div>
            )}

            {newUrl && (
              <div
                className="field-wrapper"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <TextField
                  fullWidth
                  id="url"
                  label="URL"
                  placeholder="Enter your URL"
                  variant="outlined"
                  margin="normal"
                  value={newUrl || ""}
                  onChange={(e) => setNewUrl(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                  }}
                  InputProps={{
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                    },
                  }}
                />
                <Button
                  sx={{ minWidth: "auto", height: "56px" }}
                  onClick={() => {
                    setNewUrl("");
                  }}
                >
                  <DeleteIcon />
                </Button>
              </div>
            )}

            {newLocation && (
              <div
                className="field-wrapper"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <TextField
                  fullWidth
                  id="location"
                  label="Location"
                  placeholder="Enter your location"
                  variant="outlined"
                  margin="normal"
                  value={newLocation || ""}
                  onChange={(e) => setNewLocation(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                  }}
                  InputProps={{
                    style: {
                      color: theme.palette.mode === "dark" ? "#000" : undefined,
                    },
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#000" : undefined,
                      },
                    },
                  }}
                />
                <Button
                  sx={{ minWidth: "auto", height: "56px" }}
                  onClick={() => {
                    setNewLocation("");
                  }}
                >
                  <DeleteIcon />
                </Button>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "16px",
              }}
            >
              <Button variant="outlined" onClick={handleOpenFieldCatalog}>
                Add More to Profile
              </Button>
            </div>

            <hr
              style={{
                margin: "20px 0",
                border: "0",
                borderTop: "1px solid #ddd",
              }}
            />
          </div>

          <div className="modal-buttons">
            <button className="cancel-button" onClick={handleCloseEditModal}>
              Cancel
            </button>
            <button className="save-button" onClick={handleSave}>
              Save
            </button>
          </div>
        </Box>
      </Modal>

      <Modal
        open={isNftModalOpen}
        onClose={handleCloseNftModal}
        className="nft-modal"
      >
        <Box className="edit-modal nft-modal-content">
          <h2>Select NFT</h2>
          <input
            type="text"
            placeholder="Search NFTs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nft-search"
          />
          <div className="nft-grid">
            {loading ? (
              <div className="nft-loading">Loading NFTs...</div>
            ) : filteredNfts.length === 0 ? (
              <div className="nft-empty">
                {nfts.length === 0 ? "No NFTs found" : "No matching NFTs found"}
              </div>
            ) : (
              filteredNfts.map((nft) => {
                const metadata: NFTMetadata = JSON.parse(nft.metadata);
                const imageUrl = metadata.image.startsWith("ipfs://")
                  ? `https://ipfs.io/ipfs/${metadata.image.replace(
                      "ipfs://",
                      ""
                    )}`
                  : metadata.image;
                return (
                  <div
                    key={`nft-${nft.contractId}-${nft.tokenId}`}
                    className={`nft-item ${
                      selectedNftId === `nft-${nft.contractId}-${nft.tokenId}`
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handleNftSelect(nft)}
                  >
                    <img src={imageUrl} alt={metadata.name} />
                    <p>{metadata.name}</p>
                    <p className="collection-name">{nft.collectionName}</p>
                  </div>
                );
              })
            )}
          </div>
          <div className="modal-buttons">
            <Button
              onClick={handleSelectConfirm}
              disabled={!selectedNftId}
              variant="contained"
            >
              Select
            </Button>
            <Button
              onClick={() => {
                setIsNftModalOpen(false);
              }}
              variant="outlined"
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>

      <Modal open={isPendingTx} aria-labelledby="pending-transaction-modal">
        <Box className="edit-modal" sx={{ textAlign: "center", p: 4 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <h2>Transaction Pending</h2>
          <p>Please wait while your transaction is being processed...</p>
        </Box>
      </Modal>

      <Modal
        open={isFieldCatalogOpen}
        onClose={handleCloseFieldCatalog}
        aria-labelledby="field-catalog-modal"
      >
        <Box
          className="edit-modal"
          sx={{
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2>Add Profile Fields</h2>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search fields..."
            value={fieldSearchQuery}
            onChange={(e) => setFieldSearchQuery(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                backgroundColor: "background.paper",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <List
            sx={{
              flex: 1,
              overflowY: "auto",
              minHeight: "250px",
            }}
          >
            {filteredFields.length > 0 ? (
              filteredFields.map((field) => {
                const isFieldActive =
                  (field.key === "com.twitter" && newTwitter) ||
                  (field.key === "com.github" && newGithub) ||
                  (field.key === "location" && newLocation) ||
                  (field.key === "url" && newUrl);

                return (
                  <ListItem
                    key={field.key}
                    onClick={() => handleAddField(field)}
                    selected={!!isFieldActive}
                  >
                    <ListItemIcon>{field.icon}</ListItemIcon>
                    <ListItemText primary={field.label} />
                  </ListItem>
                );
              })
            ) : (
              <ListItem>
                <ListItemText
                  primary="No fields found"
                  sx={{ textAlign: "center", color: "text.secondary" }}
                />
              </ListItem>
            )}
          </List>

          <div className="modal-buttons">
            <button className="cancel-button" onClick={handleCloseFieldCatalog}>
              Cancel
            </button>
            <button
              className="save-button"
              onClick={() => {
                handleCloseFieldCatalog();
              }}
            >
              Save
            </button>
          </div>
        </Box>
      </Modal>

      <ExtendModal
        open={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        name={name || ""}
        onConfirm={handleExtendConfirm}
      />

      <ConfirmExtendModal
        open={isConfirmExtendModalOpen}
        onClose={() => setIsConfirmExtendModalOpen(false)}
        name={name || ""}
        duration={selectedDuration}
        onConfirm={handleFinalExtendConfirm}
      />

      <TransferModal
        open={isTransferModalOpen}
        onClose={handleCloseTransferModal}
        name={name || ""}
        onConfirm={handleConfirmTransfer}
      />

      <ConfirmTransferModal
        open={isConfirmTransferModalOpen}
        onClose={() => setIsConfirmTransferModalOpen(false)}
        name={name || ""}
        newOwner={newOwnerForTransfer || ""}
        currentOwner={owner || ""}
        onConfirm={handleFinalTransferConfirm}
      />

      <Snackbar
        open={openNotification}
        autoHideDuration={2000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity="success"
          sx={{ width: "100%" }}
        >
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ProfilePage;
