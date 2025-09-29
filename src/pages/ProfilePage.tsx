import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
import { enqueueSnackbar, useSnackbar } from "notistack";
import { FastForwardIcon, SendIcon, PlusIcon } from "lucide-react";
import CloseIcon from "@mui/icons-material/Close";
import { getAlgorandClients } from "@/wallets";
import algosdk from "algosdk";
import { APP_SPEC as VNSRegistrarSpec } from "@/clients/VNSRegistrarClient";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { TRANSACTION_FEES } from "@/constants/fees";
import { useNameRegistration } from "@/hooks/useNameRegistration";
import { useNameRegistry } from "@/hooks/useNameRegistry";
import { stripTrailingZeroBytes } from "@/utils/string";
import MDEditor from "@uiw/react-md-editor";
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
  {
    key: "bio",
    label: "Bio",
    icon: <EmailIcon />,
    placeholder: "Tell us about yourself",
  },
  {
    key: "description",
    label: "Description",
    icon: <WebIcon />,
    placeholder: "Short tagline or description",
  },
  {
    key: "display",
    label: "Display Name",
    icon: <WebIcon />,
    placeholder: "Preferred display form",
  },
  {
    key: "background",
    label: "Background",
    icon: <WebIcon />,
    placeholder: "Enter color (#RRGGBBAA) or image URL",
  },
  {
    key: "banner",
    label: "Banner",
    icon: <WebIcon />,
    placeholder: "Enter color (#RRGGBBAA) or image URL",
  },
];

interface ExtendModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  onConfirm: (duration: string) => void;
  paymentTokenSymbol: string;
}

const ExtendModal: React.FC<ExtendModalProps> = ({
  open,
  onClose,
  name,
  onConfirm,
  paymentTokenSymbol,
}) => {
  const { theme } = useTheme();
  const { calculateTotalCost, setDuration, duration, getPriceBreakdownJSX } =
    useNameRegistration({ initialName: name });
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        className="edit-modal"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "#374151" : "#E5E7EB"
          }`,
          borderRadius: "12px",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          p: 3,
          position: "relative",
          minWidth: "400px",
          maxWidth: "500px",
          width: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          gap: 2,
          mb: 2,
          flexDirection: "column",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
            "&:hover": {
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F3F4F6",
            },
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
            fontWeight: 600,
            color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
            pt: 2,
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
              borderColor:
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB",
              color: theme.palette.mode === "dark" ? "#9CA3AF" : "#374151",
              "&:hover": {
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#D1D5DB",
                bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              },
            },
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setDuration((prev) => (prev > 1 ? prev - 1 : 1))}
          >
            -
          </Button>
          <Typography
            variant="h4"
            component="span"
            sx={{
              color: theme.palette.mode === "dark" ? "#8B5CF6" : "#6366F1",
              fontWeight: 600,
              minWidth: "120px",
              textAlign: "center",
              fontSize: "2rem",
            }}
          >
            {duration} year{duration !== 1 ? "s" : ""}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setDuration((prev) => prev + 1)}
          >
            +
          </Button>
        </Box>

        <Box
          sx={{
            p: 2,
            bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
            borderRadius: 1,
            border: "1px solid",
            borderColor: theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB",
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
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              }}
            >
              Extension Cost
            </Typography>
            <Tooltip title={getPriceBreakdownJSX()} arrow>
              <IconButton
                size="small"
                sx={{
                  color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {calculateTotalCost().namePrice.toLocaleString()}{" "}
            {paymentTokenSymbol}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              textAlign: "center",
              display: "block",
            }}
          >
            Transaction Fees: {calculateTotalCost().fees.toLocaleString()} VOI
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              fontWeight: "bold",
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              textAlign: "center",
            }}
          >
            Total:{" "}
            {paymentTokenSymbol === "VOI"
              ? `${calculateTotalCost().total.toLocaleString()} VOI`
              : `${calculateTotalCost().namePrice.toLocaleString()} ${paymentTokenSymbol} + ${calculateTotalCost().fees.toLocaleString()} VOI`}
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
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB"
              }`,
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#374151",
              fontWeight: 600,
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => onConfirm(String(duration))}
            sx={{
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#6366F1",
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "white",
              fontWeight: 600,
              border:
                theme.palette.mode === "dark" ? "1px solid #4B5563" : "none",
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#5B21B6",
                borderColor: theme.palette.mode === "dark" ? "#6B7280" : "none",
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
  parentName: string;
  parentAppId: number;
  paymentToken: number;
  paymentTokenDecimals: number;
  paymentTokenSymbol: string;
}

const ConfirmExtendModal: React.FC<ConfirmExtendModalProps> = ({
  open,
  onClose,
  name,
  parentName,
  parentAppId,
  paymentToken,
  paymentTokenDecimals,
  paymentTokenSymbol,
  duration,
  onConfirm,
}) => {
  const { theme } = useTheme();
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
    initialParentName: parentName,
    initialParentAppId: parentAppId,
    initialPaymentToken: paymentToken,
    initialPaymentTokenDecimals: paymentTokenDecimals,
    initialPaymentTokenSymbol: paymentTokenSymbol,
  });

  console.log({
    name,
    parentName,
    parentAppId,
    paymentToken,
    paymentTokenDecimals,
    paymentTokenSymbol,
    duration,
  });

  console.log("name", name);

  const { getExpiry } = useNameRegistry(name);

  useEffect(() => {
    setDuration(parseInt(duration));
  }, [duration, setDuration]);

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
      await handleConfirmRenewVOI(
        name,
        parentName,
        parentAppId,
        paymentToken,
        paymentTokenDecimals,
        paymentTokenSymbol
      );
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        className="edit-modal"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "#374151" : "#E5E7EB"
          }`,
          borderRadius: "12px",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          p: 3,
          position: "relative",
          minWidth: "400px",
          maxWidth: "500px",
          width: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            mb: 3,
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: 600,
            color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
          }}
        >
          Confirm Details
        </Typography>

        <Typography
          sx={{
            mb: 3,
            color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
            textAlign: "center",
          }}
        >
          Double check these details before confirming in your wallet.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB"
              }`,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                fontWeight: 500,
              }}
            >
              Name
            </Typography>
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                fontWeight: 600,
              }}
            >
              {name}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB"
              }`,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                fontWeight: 500,
              }}
            >
              Action
            </Typography>
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                fontWeight: 600,
              }}
            >
              Extend registration
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB"
              }`,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                fontWeight: 500,
              }}
            >
              Duration
            </Typography>
            <Box sx={{ textAlign: "right" }}>
              <Typography
                sx={{
                  color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                  fontWeight: 600,
                }}
              >
                {duration} year{parseInt(duration) !== 1 ? "s" : ""}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                }}
              >
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
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB"
              }`,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                fontWeight: 500,
              }}
            >
              Cost
            </Typography>
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                fontWeight: 600,
              }}
            >
              {calculateTotalCost().namePrice.toLocaleString()}{" "}
              {paymentTokenSymbol} +{" "}
              {calculateTotalCost().fees.toLocaleString()} VOI
              <Tooltip title={getPriceBreakdownJSX()} arrow>
                <IconButton
                  size="small"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                  }}
                >
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
            sx={{
              flex: 1,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB"
              }`,
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#374151",
              fontWeight: 600,
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#374151" : "#E5E7EB",
                color: theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
            }}
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
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#6366F1",
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "white",
              fontWeight: 600,
              border:
                theme.palette.mode === "dark" ? "1px solid #4B5563" : "none",
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#5B21B6",
                borderColor: theme.palette.mode === "dark" ? "#6B7280" : "none",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              },
            }}
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
  const { theme } = useTheme();
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
      <Box
        className="edit-modal"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "#374151" : "#E5E7EB"
          }`,
          borderRadius: "12px",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
            "&:hover": {
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F3F4F6",
            },
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
            fontWeight: 600,
            color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
            pt: 2,
          }}
        >
          Transfer {name}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            textAlign: "center",
            color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
            lineHeight: 1.5,
          }}
        >
          Transfer ownership of this name to another address. This action cannot
          be undone.
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
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              "& fieldset": {
                borderColor:
                  theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
              },
              "&:hover fieldset": {
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
              "&.Mui-focused fieldset": {
                borderColor:
                  theme.palette.mode === "dark" ? "#EF4444" : "#EF4444",
              },
            },
            "& .MuiInputLabel-root": {
              color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              "&.Mui-focused": {
                color: theme.palette.mode === "dark" ? "#EF4444" : "#EF4444",
              },
            },
            "& .MuiInputBase-input": {
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
            },
            "& .MuiFormHelperText-root": {
              color: theme.palette.mode === "dark" ? "#EF4444" : "#EF4444",
            },
          }}
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
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB"
              }`,
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#374151",
              fontWeight: 600,
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
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
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#6366F1",
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "white",
              fontWeight: 600,
              border:
                theme.palette.mode === "dark" ? "1px solid #4B5563" : "none",
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#5B21B6",
                borderColor: theme.palette.mode === "dark" ? "#6B7280" : "none",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
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

interface ConfirmSetDefaultModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  onConfirm: () => void;
}

const ConfirmSetDefaultModal: React.FC<ConfirmSetDefaultModalProps> = ({
  open,
  onClose,
  name,
  onConfirm,
}) => {
  const { theme } = useTheme();
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
      <Box
        className="edit-modal"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "#374151" : "#E5E7EB"
          }`,
          borderRadius: "12px",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          p: 3,
          position: "relative",
          minWidth: "400px",
          maxWidth: "500px",
          width: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            mb: 3,
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: 600,
            color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
          }}
        >
          Set as Default Name
        </Typography>

        <Typography
          sx={{
            mb: 3,
            color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
            textAlign: "center",
          }}
        >
          Are you sure you want to set <strong>{name}</strong> as your default
          name? This will make it your primary identity across the platform.
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            disabled={isConfirming}
            sx={{
              flex: 1,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB"
              }`,
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#374151",
              fontWeight: 600,
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#374151" : "#E5E7EB",
                color: theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
            }}
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
              bgcolor: "#10B981",
              color: "white",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "#059669",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              },
            }}
          >
            {isConfirming ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Setting...
              </Box>
            ) : (
              "Set as Default"
            )}
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
  const { theme } = useTheme();
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
      <Box
        className="edit-modal"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "#374151" : "#E5E7EB"
          }`,
          borderRadius: "12px",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            mb: 3,
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: 600,
            color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
          }}
        >
          Confirm Transfer
        </Typography>

        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: theme.palette.mode === "dark" ? "#374151" : "#FEF2F2",
            border: `1px solid ${
              theme.palette.mode === "dark" ? "#EF4444" : "#FECACA"
            }`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              color: theme.palette.mode === "dark" ? "#FCA5A5" : "#DC2626",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            ⚠️ Warning: This action cannot be undone!
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB"
              }`,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                fontWeight: 500,
              }}
            >
              Name
            </Typography>
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                fontWeight: 600,
              }}
            >
              {name}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB"
              }`,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                fontWeight: 500,
              }}
            >
              Current Owner
            </Typography>
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                fontWeight: 600,
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              {currentOwner}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              borderRadius: 1,
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB"
              }`,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                fontWeight: 500,
              }}
            >
              New Owner
            </Typography>
            <Typography
              sx={{
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                fontWeight: 600,
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              {newOwner}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            disabled={isConfirming}
            sx={{
              flex: 1,
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB"
              }`,
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#374151",
              fontWeight: 600,
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#374151" : "#E5E7EB",
                color: theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
            }}
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
              bgcolor: "#EF4444",
              color: "white",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "#DC2626",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
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

interface MintModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mintToAddress: string;
  setMintToAddress: (address: string) => void;
  profileName: string;
  isPendingTx: boolean;
}

const MintModal: React.FC<MintModalProps> = ({
  open,
  onClose,
  onConfirm,
  mintToAddress,
  setMintToAddress,
  profileName,
  isPendingTx,
}) => {
  const { theme } = useTheme();
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
    setMintToAddress(address);
    validateAddress(address);
  };

  const handleConfirm = () => {
    if (isValidAddress && mintToAddress.trim() && profileName.trim()) {
      onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        className="edit-modal"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "#374151" : "#E5E7EB"
          }`,
          borderRadius: "12px",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          p: 3,
          position: "relative",
          minWidth: "400px",
          maxWidth: "500px",
          width: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
            "&:hover": {
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F3F4F6",
            },
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
            fontWeight: 600,
            color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
            pt: 2,
          }}
        >
          Mint {profileName}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            textAlign: "center",
            color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
            lineHeight: 1.5,
          }}
        >
          Mint <strong>{profileName}</strong> NFT to the specified address. This
          action requires controller permissions.
        </Typography>

        <TextField
          fullWidth
          label="Name to Mint"
          value={profileName}
          disabled
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#F3F4F6",
              "& fieldset": {
                borderColor:
                  theme.palette.mode === "dark" ? "#374151" : "#D1D5DB",
              },
            },
            "& .MuiInputLabel-root": {
              color: theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
            },
            "& .MuiInputBase-input": {
              color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
            },
          }}
        />

        <TextField
          fullWidth
          label="Recipient Address"
          placeholder="Enter Algorand address"
          value={mintToAddress}
          onChange={handleAddressChange}
          error={mintToAddress.length > 0 && !isValidAddress}
          helperText={
            mintToAddress.length > 0 && !isValidAddress
              ? "Please enter a valid Algorand address"
              : ""
          }
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              "& fieldset": {
                borderColor:
                  theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
              },
              "&:hover fieldset": {
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
              "&.Mui-focused fieldset": {
                borderColor:
                  theme.palette.mode === "dark" ? "#10B981" : "#10B981",
              },
            },
            "& .MuiInputLabel-root": {
              color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              "&.Mui-focused": {
                color: theme.palette.mode === "dark" ? "#10B981" : "#10B981",
              },
            },
            "& .MuiInputBase-input": {
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
            },
            "& .MuiFormHelperText-root": {
              color: theme.palette.mode === "dark" ? "#10B981" : "#10B981",
            },
          }}
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
            disabled={isPendingTx}
            sx={{
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB"
              }`,
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#374151",
              fontWeight: 600,
              "&:hover": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#F3F4F6",
                borderColor:
                  theme.palette.mode === "dark" ? "#374151" : "#E5E7EB",
                color: theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleConfirm}
            disabled={!isValidAddress || !mintToAddress.trim() || isPendingTx}
            sx={{
              bgcolor: "#10B981",
              color: "white",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "#059669",
              },
              "&:disabled": {
                bgcolor: theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              },
            }}
          >
            {isPendingTx ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Minting...
              </Box>
            ) : (
              "Mint"
            )}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

interface SubnameModalProps {
  open: boolean;
  onClose: () => void;
  parentName: string;
  onConfirmSubname: (subname: string, recipientAddress: string) => void;
}

const SubnameModal: React.FC<SubnameModalProps> = ({
  open,
  onClose,
  parentName,
  onConfirmSubname,
}) => {
  const { theme } = useTheme();
  const [subname, setSubname] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  const handleCreate = () => {
    if (!subname.trim() || !recipientAddress.trim()) return;
    onConfirmSubname(subname.trim(), recipientAddress.trim());
  };

  const handleClose = () => {
    setSubname("");
    setRecipientAddress("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} aria-labelledby="subname-modal">
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "500px",
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          borderRadius: "12px",
          boxShadow: 24,
          p: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              fontWeight: 600,
            }}
          >
            Create New Subname
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              }}
            />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
              mb: 2,
            }}
          >
            Create a subname under <strong>{parentName}</strong>
          </Typography>

          <TextField
            fullWidth
            label="Subname"
            placeholder="Enter subname (e.g., 'blog')"
            value={subname}
            onChange={(e) => setSubname(e.target.value.toLowerCase())}
            sx={{
              mb: 2,
              "& .MuiInputLabel-root": {
                color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
              },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    theme.palette.mode === "dark" ? "#374151" : "#D1D5DB",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
                },
              },
            }}
          />

          <TextField
            fullWidth
            label="Recipient Address"
            placeholder="Enter recipient address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiInputLabel-root": {
                color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
              },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    theme.palette.mode === "dark" ? "#374151" : "#D1D5DB",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
                },
              },
            }}
          />

          <Typography
            variant="body2"
            sx={{
              color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              fontSize: "0.875rem",
            }}
          >
            This will create:{" "}
            <strong>
              {subname || "subname"}.{parentName}
            </strong>
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{
              borderColor:
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              "&:hover": {
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!subname.trim() || !recipientAddress.trim()}
            sx={{
              backgroundColor:
                theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "#2563EB" : "#2563EB",
              },
              "&:disabled": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "#374151" : "#E5E7EB",
                color: theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
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

interface ConfirmSubnameModalProps {
  open: boolean;
  onClose: () => void;
  parentName: string;
  subname: string;
  recipientAddress: string;
  onConfirm: () => void;
}

const ConfirmSubnameModal: React.FC<ConfirmSubnameModalProps> = ({
  open,
  onClose,
  parentName,
  subname,
  recipientAddress,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const formatCompactAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      enqueueSnackbar("Address copied to clipboard", {
        variant: "success",
        anchorOrigin: {
          vertical: "top",
          horizontal: "center",
        },
      });
    } catch (err) {
      enqueueSnackbar("Failed to copy address", {
        variant: "error",
        anchorOrigin: {
          vertical: "top",
          horizontal: "center",
        },
      });
    }
  };

  const openInExplorer = () => {
    const explorerUrl = `https://block.voi.network/explorer/account/${recipientAddress}/transactions`;
    window.open(explorerUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-subname-modal"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "500px",
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          borderRadius: "12px",
          boxShadow: 24,
          p: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              fontWeight: 600,
            }}
          >
            Confirm Subname Creation
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon
              sx={{
                color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
              }}
            />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              mb: 2,
            }}
          >
            You are about to create:
          </Typography>

          <Box
            sx={{
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F3F4F6",
              borderRadius: "8px",
              p: 2,
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {subname}.{parentName}
            </Typography>
          </Box>

          <Typography
            variant="body2"
            sx={{
              color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
              mb: 2,
            }}
          >
            This will create a new subname under <strong>{parentName}</strong>{" "}
            owned by:
          </Typography>

          <Box
            sx={{
              bgcolor: theme.palette.mode === "dark" ? "#374151" : "#F3F4F6",
              borderRadius: "8px",
              p: 2,
              mb: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
                fontWeight: 500,
                fontFamily: "monospace",
              }}
            >
              {formatCompactAddress(recipientAddress)}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(recipientAddress)}
                sx={{
                  color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                  "&:hover": {
                    color:
                      theme.palette.mode === "dark" ? "#D1D5DB" : "#374151",
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB",
                  },
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={openInExplorer}
                sx={{
                  color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                  "&:hover": {
                    color:
                      theme.palette.mode === "dark" ? "#D1D5DB" : "#374151",
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB",
                  },
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Typography
            variant="body2"
            sx={{
              color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
              mb: 2,
            }}
          >
            This subname can be used for:
          </Typography>

          <Box sx={{ ml: 2 }}>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                mb: 1,
              }}
            >
              • Address resolution
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                mb: 1,
              }}
            >
              • Profile records
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                mb: 1,
              }}
            >
              • Custom text records
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              borderColor:
                theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              "&:hover": {
                borderColor:
                  theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onConfirm}
            sx={{
              backgroundColor:
                theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "#2563EB" : "#2563EB",
              },
            }}
          >
            Create Subname
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

interface SubnameProgressModalProps {
  open: boolean;
  onClose: () => void;
  parentName: string;
  parentAppId: number;
  subname: string;
  recipientAddress: string;
  onComplete: () => void;
}

const SubnameProgressModal: React.FC<SubnameProgressModalProps> = ({
  open,
  onClose,
  parentName,
  parentAppId,
  subname,
  recipientAddress,
  onComplete,
}) => {
  const { activeAccount, signTransactions, transactionSigner } = useWallet();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    {
      title: "Preparing Transaction",
      description: "Setting up subname creation parameters",
      icon: <CircularProgress size={20} />,
    },
    {
      title: "Creating Subname",
      description: `Registering ${subname}.${parentName}`,
      icon: <CircularProgress size={20} />,
    },
    {
      title: "Updating Registry",
      description: "Adding subname to the registry",
      icon: <CircularProgress size={20} />,
    },
    {
      title: "Complete",
      description: "Subname created successfully",
      icon: <CheckCircleIcon sx={{ color: "#10B981" }} />,
    },
  ];

  useEffect(() => {
    if (open) {
      executeSubnameTransaction();
    }
  }, [open]);

  const executeSubnameTransaction = async () => {
    setIsProcessing(true);
    if (!activeAccount) {
      enqueueSnackbar("Please connect your wallet to create a subname", {
        variant: "error",
      });
      return;
    }
    try {
      // Step 1: Preparing Transaction
      setCurrentStep(0);

      // Determine the parent app ID for the subname (same logic as ProfilePage)
      const { algodClient, indexerClient } = getAlgorandClients();
      const subnameNode = namehash(`${subname}.${parentName}`);

      const vns = {
        registry: 797607,
        resolver: 797608,
        registrar: parentAppId,
        reverseRegistrar: 797610,
      };
      const ciRegistrar = new CONTRACT(
        Number(vns.registrar),
        algodClient,
        indexerClient,
        { ...VNSRegistrarSpec.contract, events: [] },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      const ciRegistry = new CONTRACT(
        Number(vns.registry),
        algodClient,
        indexerClient,
        { ...VNSRegistrySpec.contract, events: [] },
        {
          addr:
            activeAccount.address ||
            algosdk.getApplicationAddress(vns.registry),
          sk: new Uint8Array(),
        }
      );
      const ciResolver = new CONTRACT(
        vns.resolver,
        algodClient,
        indexerClient,
        { ...VNSPublicResolverSpec.contract, events: [] },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      const tokenId = uint8ArrayToBigInt(await namehash(parentName));
      console.log("tokenId", tokenId);
      const tokenOwnerR = await ciRegistrar.arc72_ownerOf(tokenId);
      if (!tokenOwnerR.success) {
        throw new Error("Failed to get owner of token");
      }
      const tokenOwner = tokenOwnerR.returnValue;
      console.log("tokenOwner", tokenOwner);
      if (tokenOwner !== activeAccount.address) {
        throw new Error("Token not owned by active account");
      }
      const ownerOfR = await ciRegistry.ownerOf(await namehash(parentName));
      if (!ownerOfR.success) {
        throw new Error("Failed to get owner of node");
      }
      const nodeOwner = ownerOfR.returnValue;
      const subnameRegistrarR = await ciResolver.text(
        await namehash(`${parentName}`),
        stringToUint8Array(`subname_registrar`, 22)
      );
      let subnameRegistrar = null;
      if (!subnameRegistrarR.success) {
        throw new Error("Failed to get text");
      } else {
        try {
          subnameRegistrar = JSON.parse(
            stripTrailingZeroBytes(subnameRegistrarR.returnValue)
          );
        } catch (e) {
          console.log("error", e);
        }
      }
      console.log("subnameRegistrar", subnameRegistrar);

      let subnameParentAppId = 0;

      do {
        if (
          !!subnameRegistrar &&
          subnameRegistrar.subname_registrar === parentName
        ) {
          subnameParentAppId = Number(subnameRegistrar.contract);
        }

        // if the node owner is the active account, we likely have to deploy a new registrar
        // or update the existing
        // if (nodeOwner === activeAccount.address) {
        //   break;
        // }

        // TODO: Get application transactions for the subname node
        // This should follow the same pattern as ProfilePage to find the registrar
        const applicationTransactions = await indexerClient
          .lookupAccountTransactions(nodeOwner)
          .do();

        // TODO: Find the registrar application transaction
        const applicationTransaction =
          applicationTransactions.transactions.find((txn: any) => {
            const mAppId = txn["application-transaction"]?.["application-id"];
            if (!mAppId) {
              return false;
            }
            return algosdk.getApplicationAddress(mAppId) === nodeOwner;
          });

        if (!applicationTransaction) {
          break;
        }

        subnameParentAppId =
          applicationTransaction["application-transaction"]["application-id"];
      } while (0);

      if (subnameParentAppId === 0) {
        // if the subname parent app id is 0, we need to deploy a new registrar
        // set subnameParentAppId to the application id of the registrar
        const clientParams: any = {
          resolveBy: "creatorAndName",
          findExistingUsing: indexerClient,
          creatorAddress: activeAccount.address,
          name: `vns-registrar-${parentName}`,
          sender: {
            addr: activeAccount.address,
            signer: transactionSigner,
          },
        };
        const appClient = new VnsRegistrarClient(clientParams, algodClient);
        if (appClient) {
          console.log(appClient);
          const app = await appClient.deploy({
            deployTimeParams: {},
            onUpdate: "update",
            onSchemaBreak: "fail",
          });
          subnameParentAppId = Number(app.appId);
        }
      }
      if (subnameParentAppId === 0) {
        throw new Error("Failed to deploy registrar");
      }
      const ci = new CONTRACT(
        subnameParentAppId,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      const builder = {
        parentRegistrar: new CONTRACT(
          parentAppId,
          algodClient,
          indexerClient,
          { ...VNSRegistrarSpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
        registrar: new CONTRACT(
          subnameParentAppId,
          algodClient,
          indexerClient,
          { ...VNSRegistrarSpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
        resolver: new CONTRACT(
          vns.resolver,
          algodClient,
          indexerClient,
          { ...VNSPublicResolverSpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
        registry: new CONTRACT(
          vns.registry,
          algodClient,
          indexerClient,
          { ...VNSRegistrySpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
      };
      const ciSubnameRegistrar = new CONTRACT(
        subnameParentAppId,
        algodClient,
        indexerClient,
        { ...VNSRegistrarSpec.contract, events: [] },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      const buildN = [];
      // if parent node not owned by active account
      //   reclaim through parent registrar
      const nodeId = await namehash(parentName);
      const ownerNodeR = await ciRegistry.ownerOf(nodeId);
      if (!ownerNodeR.success) {
        throw new Error("Failed to get owner of node");
      }
      const ownerNode = ownerNodeR.returnValue;
      console.log("ownerNode", ownerNode);
      if (ownerNode !== activeAccount.address) {
        const txnO = (
          await builder.parentRegistrar.reclaim(
            stringToUint8Array(parentName.split(".")[0], 32)
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `parentRegistrar reclaim ${parentName}`
          ),
        });
      }
      // if subnmae_registrar not set
      //   resolver set text subname_registrar
      if (!subnameRegistrar) {
        const txnO = (
          await builder.resolver.setText(
            await namehash(`${parentName}`),
            stringToUint8Array(`subname_registrar`, 22),
            stringToUint8Array(
              JSON.stringify({
                subname_registrar: `${parentName}`,
                contract: `${subnameParentAppId}`,
              }),
              256
            )
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `resolver setText subname_registrar ${parentName} ${subnameParentAppId}`
          ),
        });
      }
      //if not owned by active account and not owned by registrar
      //  reclaim through registrar
      // if (ownerNode !== activeAccount.address) {
      //   const txnO = (
      //     await builder.parentRegistrar.reclaim(stringToUint8Array(subname, 32))
      //   )?.obj;
      //   buildN.push({
      //     ...txnO,
      //     note: new TextEncoder().encode(
      //       `registrar reclaim ${subname}.${parentName}`
      //     ),
      //   });
      // }
      // should be owned by active account
      // if owned by active account and not owned by registrar
      //   registry transfer node ownership to the new registrar application address
      if (ownerNode !== algosdk.getApplicationAddress(subnameParentAppId)) {
        const txnO = (
          await builder.registry.setOwner(
            await namehash(`${parentName}`),
            algosdk.getApplicationAddress(subnameParentAppId)
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `registry setOwner ${parentName} to ${algosdk.getApplicationAddress(
              subnameParentAppId
            )}`
          ),
        });
      }
      // if root node not set
      //   registrar set root node
      const get_root_nodeR = await ciSubnameRegistrar.get_root_node();
      if (!get_root_nodeR.success) {
        throw new Error("Failed to get root node");
      }
      const root_node = get_root_nodeR.returnValue;
      console.log("root_node", root_node);
      if (root_node !== "") {
        const txnO = (
          await builder.registrar.set_root_node(await namehash(`${parentName}`))
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `registrar set_root_node to ${parentName}`
          ),
        });
      }
      // if registrar registry not vns.registry
      //   registrar set registry to vns.registry
      const get_registryR = await ciSubnameRegistrar.get_registry();
      if (!get_registryR.success) {
        throw new Error("Failed to get registry");
      }
      const registry = Number(get_registryR.returnValue);
      console.log("registry", registry);
      if (registry !== vns.registry) {
        const txnO = (await builder.registrar.set_registry(vns.registry))?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `registrar set_registry to ${vns.registry}`
          ),
        });
      }
      // mint subname to active account
      const txnO = (
        await builder.registrar.mint(
          activeAccount.address,
          stringToUint8Array(subname, 32)
        )
      )?.obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode(
          `registrar mint ${subname}.${parentName}`
        ),
        payment: 336700,
      });
      // reclaim subname
      {
        const txnO = (
          await builder.registrar.reclaim(stringToUint8Array(subname, 32))
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `registrar reclaim ${subname}.${parentName}`
          ),
        });
      }
      // if subname text name is does not match subname
      //   resolver set name in resolver eg text name subname.voi
      const nameR = await ciResolver.name(
        await namehash(`${subname}.${parentName}`)
      );
      if (!nameR.success) {
        throw new Error("Failed to get name");
      }
      const name = nameR.returnValue;
      console.log("name", name);
      if (name !== `${subname}.${parentName}`) {
        const txnO = (
          await builder.resolver.setName(
            await namehash(`${subname}.${parentName}`),
            stringToUint8Array(`${subname}.${parentName}`, 256)
          )
        )?.obj;
        buildN.push({
          ...txnO,
          payment: 336701,
          note: new TextEncoder().encode(
            `resolver setName ${subname}.${parentName}`
          ),
        });
      }
      // registry node set owner to recipient
      {
        const txnO = (
          await builder.registry.setOwner(
            await namehash(`${subname}.${parentName}`),
            recipientAddress
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `registry transfer ${subname}.${parentName} to ${recipientAddress}`
          ),
        });
      }
      // registrar token transfer to recipient
      {
        const txnO = (
          await builder.registrar.arc72_transferFrom(
            activeAccount.address,
            recipientAddress,
            uint8ArrayToBigInt(await namehash(`${subname}.${parentName}`))
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `registrar arc72_transferFrom ${subname}.${parentName} to ${recipientAddress}`
          ),
        });
      }
      // build and simulate
      console.log({ buildN });
      ci.setExtraTxns(buildN);
      ci.setFee(10000);
      ci.setEnableGroupResourceSharing(true);
      const customR = await ci.custom();
      console.log({ customR });
      if (!customR.success) {
        throw new Error("Failed to create subname");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Creating Subname
      setCurrentStep(1);

      // sign
      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Updating Registry
      setCurrentStep(2);

      // send
      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 4: Complete
      setCurrentStep(3);
      setIsProcessing(false);

      // Auto-close after 2 seconds and navigate
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error("Error executing subname transaction:", error);
      setIsProcessing(false);
      enqueueSnackbar("Failed to create subname. Please try again.", {
        variant: "error",
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={isProcessing ? undefined : onClose}
      aria-labelledby="subname-progress-modal"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "500px",
          bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
          borderRadius: "12px",
          boxShadow: 24,
          p: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              fontWeight: 600,
            }}
          >
            Creating Subname
          </Typography>
          {!isProcessing && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon
                sx={{
                  color: theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                }}
              />
            </IconButton>
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              mb: 2,
              textAlign: "center",
            }}
          >
            Creating{" "}
            <strong>
              {subname}.{parentName}
            </strong>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          {steps.map((step, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                opacity: index <= currentStep ? 1 : 0.5,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 2,
                  bgcolor:
                    index < currentStep
                      ? "#10B981"
                      : index === currentStep
                      ? theme.palette.mode === "dark"
                        ? "#3B82F6"
                        : "#3B82F6"
                      : theme.palette.mode === "dark"
                      ? "#374151"
                      : "#E5E7EB",
                  color:
                    index <= currentStep
                      ? "#FFFFFF"
                      : theme.palette.mode === "dark"
                      ? "#6B7280"
                      : "#9CA3AF",
                }}
              >
                {index < currentStep ? <CheckCircleIcon /> : step.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                    fontWeight: index === currentStep ? 600 : 400,
                  }}
                >
                  {step.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                  }}
                >
                  {step.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {currentStep === 3 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "#10B981",
                fontWeight: 600,
              }}
            >
              ✓ Subname created successfully!
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

const ProfilePage: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const { name } = useParams<{ name: string }>();
  const { theme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

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
  const [githubValidationStatus, setGithubValidationStatus] = React.useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");
  const [githubContributions, setGithubContributions] = React.useState<any[]>(
    []
  );
  const [showContributions, setShowContributions] = React.useState(false);
  const [github, setGithub] = React.useState<string | null>(null);
  const [newGithub, setNewGithub] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<string | null>(null);
  const [newLocation, setNewLocation] = React.useState<string | null>(null);
  const [bio, setBio] = React.useState<string | null>(null);
  const [newBio, setNewBio] = React.useState<string | null>(null);
  const [bioPages, setBioPages] = React.useState<string[]>([]);
  const [newBioPages, setNewBioPages] = React.useState<string[]>([]);
  const [bioError, setBioError] = React.useState<string>("");
  const [description, setDescription] = React.useState<string | null>(null);
  const [newDescription, setNewDescription] = React.useState<string | null>(
    null
  );
  const [display, setDisplay] = React.useState<string | null>(null);
  const [newDisplay, setNewDisplay] = React.useState<string | null>(null);
  const [background, setBackground] = React.useState<string | null>(null);
  const [newBackground, setNewBackground] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<string | null>(null);
  const [newBanner, setNewBanner] = React.useState<string | null>(null);
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
  const [newOwnerForTransfer, setNewOwnerForTransfer] = useState<string | null>(
    null
  );
  const [isSetDefaultModalOpen, setIsSetDefaultModalOpen] = useState(false);
  const [parentName, setParentName] = useState<string>("voi");
  const [parentAppId, setParentAppId] = useState<number>(797609);
  const [paymentToken, setPaymentToken] = useState<number>(828295);
  const [paymentTokenDecimals, setPaymentTokenDecimals] = useState<number>(6);
  const [paymentTokenSymbol, setPaymentTokenSymbol] = useState<string>("VOI");

  const [isController, setIsController] = useState<boolean>(false);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [mintToAddress, setMintToAddress] = useState<string>("");
  const [isSubnameModalOpen, setIsSubnameModalOpen] = useState(false);
  const [isConfirmSubnameModalOpen, setIsConfirmSubnameModalOpen] =
    useState(false);
  const [isSubnameProgressModalOpen, setIsSubnameProgressModalOpen] =
    useState(false);
  const [pendingSubname, setPendingSubname] = useState<string>("");
  const [pendingRecipientAddress, setPendingRecipientAddress] =
    useState<string>("");
  interface SubnameRegistrar {
    subname_registrar: string;
    contract: string;
  }
  const [subnameRegistrar, setSubnameRegistrar] =
    useState<SubnameRegistrar | null>(null);
  const [nodeOwner, setNodeOwner] = useState<string | null>(null);

  // check node owner to check if mint button should be shown
  useEffect(() => {
    if (!name) return;
    (async () => {
      const { algodClient, indexerClient } = getAlgorandClients();
      const registryAppId = 797607;
      const resolver = new CONTRACT(
        registryAppId,
        algodClient,
        indexerClient,
        { ...VNSRegistrySpec.contract, events: [] },
        {
          addr: algosdk.getApplicationAddress(registryAppId),
          sk: new Uint8Array(),
        }
      );
      const nodeOwnerR = await resolver.ownerOf(await namehash(name));
      if (!nodeOwnerR.success) {
        setNodeOwner(null);
      } else {
        setNodeOwner(nodeOwnerR.returnValue);
      }
    })();
  }, [name]);

  useEffect(() => {
    if (!name) return;
    (async () => {
      const { algodClient, indexerClient } = getAlgorandClients();
      const resolverAppId = 797608;
      const resolver = new CONTRACT(
        resolverAppId,
        algodClient,
        indexerClient,
        { ...VNSPublicResolverSpec.contract, events: [] },
        {
          addr: algosdk.getApplicationAddress(resolverAppId),
          sk: new Uint8Array(),
        }
      );
      const subnameRegistrarR = await resolver.text(
        await namehash(name),
        stringToUint8Array("subname_registrar", 22)
      );
      if (!subnameRegistrarR.success) {
        setSubnameRegistrar(null);
      } else {
        let subnameRegistrar = null;
        try {
          subnameRegistrar = JSON.parse(
            stripTrailingZeroBytes(subnameRegistrarR.returnValue)
          );
        } catch (e) {
          console.log("error", e);
        }
        setSubnameRegistrar(subnameRegistrar);
      }
    })();
  }, [name]);
  console.log("subnameRegistrar", subnameRegistrar);

  useEffect(() => {
    if (!name) return;
    const parentName = name.split(".").slice(1).join(".");
    if (parentName === "voi") {
      setParentName("voi");
      setParentAppId(797609);
      setPaymentToken(828295);
      setPaymentTokenDecimals(6);
      setPaymentTokenSymbol("VOI");
      return;
    }
    if (name) {
      console.log("parentName", parentName, "name", name);
      setParentName(parentName);
      (async () => {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new CONTRACT(
          Number(797607),
          algodClient,
          indexerClient,
          { ...VNSRegistrySpec.contract, events: [] },
          {
            addr:
              activeAccount?.address || algosdk.getApplicationAddress(797607),
            sk: new Uint8Array(),
          }
        );
        const ownerOfR = await ci.ownerOf(await namehash(parentName));
        const nodeOwner = ownerOfR.returnValue;

        console.log("nodeOwner", nodeOwner);

        const accInfo = await indexerClient
          .searchForTransactions()
          .address(nodeOwner)
          .do();
        const applicationTransaction = accInfo.transactions.find(
          (txn: any) =>
            txn["tx-type"] === "appl" &&
            algosdk.getApplicationAddress(
              txn["application-transaction"]["application-id"]
            ) === nodeOwner
        );
        if (!applicationTransaction) {
          setParentAppId(0);
          return;
        }
        const appId =
          applicationTransaction["application-transaction"]["application-id"];

        console.log("appId", appId);
        setParentAppId(appId);

        console.log("appId", appId);

        const ciRegistrar = new CONTRACT(
          appId,
          algodClient,
          indexerClient,
          { ...VNSRegistrarSpec.contract, events: [] },
          {
            addr:
              activeAccount?.address || algosdk.getApplicationAddress(appId),
            sk: new Uint8Array(),
          }
        );
        const getPaymentTokenR = await ciRegistrar.get_payment_token();
        if (!getPaymentTokenR.success) {
          setPaymentToken(0);
          setPaymentTokenDecimals(0);
          setPaymentTokenSymbol("");
        } else {
          const paymentToken = Number(getPaymentTokenR.returnValue);
          if (paymentToken === 0) {
            setPaymentToken(0);
            setPaymentTokenDecimals(0);
            setPaymentTokenSymbol("");
          }
          setPaymentToken(paymentToken);
          const ciArc200 = new CONTRACT(
            paymentToken,
            algodClient,
            indexerClient,
            abi.nt200,
            {
              addr:
                activeAccount?.address || algosdk.getApplicationAddress(appId),
              sk: new Uint8Array(),
            }
          );
          const getPaymentTokenDecimalsR = await ciArc200.arc200_decimals();
          if (!getPaymentTokenDecimalsR.success) {
            setPaymentTokenDecimals(0);
            //throw new Error("Failed to get payment token decimals");
          }
          setPaymentTokenDecimals(Number(getPaymentTokenDecimalsR.returnValue));
          const getPaymentTokenSymbolR = await ciArc200.arc200_symbol();
          if (!getPaymentTokenSymbolR.success) {
            setPaymentTokenSymbol("");
          }
          setPaymentTokenSymbol(getPaymentTokenSymbolR.returnValue);
        }
      })();
    }
  }, [name]);
  console.log("parentName", parentName);
  console.log("parentAppId", parentAppId);
  console.log("paymentToken", paymentToken);
  console.log("paymentTokenDecimals", paymentTokenDecimals);
  console.log("paymentTokenSymbol", paymentTokenSymbol);

  useEffect(() => {
    if (parentAppId) {
      (async () => {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new CONTRACT(
          parentAppId,
          algodClient,
          indexerClient,
          { ...VNSRegistrarSpec.contract, events: [] },
          {
            addr:
              activeAccount?.address ||
              algosdk.getApplicationAddress(parentAppId),
            sk: new Uint8Array(),
          }
        );
        const isControllerR = await ci.is_controller(activeAccount?.address);
        setIsController(isControllerR.returnValue);
        console.log("isController", isControllerR.returnValue);
      })();
    }
  }, [parentAppId]);

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
    setNewBio(bio);
    setNewBioPages(bioPages);
    setNewDescription(description);
    setNewDisplay(display);
    setNewBackground(background);
    setNewBanner(banner);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setNewTwitter(null);
    setNewGithub(null);
    setNewLocation(null);
    setNewUrl(null);
    setNewBio(null);
    setNewBioPages([]);
    setBioError("");
    setNewDescription(null);
    setNewDisplay(null);
    setNewBackground(null);
    setNewBanner(null);
  };

  const handleCreateSubname = () => {
    setIsSubnameModalOpen(true);
  };

  const handleCloseSubnameModal = () => {
    setIsSubnameModalOpen(false);
  };

  const handleConfirmSubname = (subname: string, recipientAddress: string) => {
    setPendingSubname(subname);
    setPendingRecipientAddress(recipientAddress);
    setIsSubnameModalOpen(false);
    setIsConfirmSubnameModalOpen(true);
  };

  const handleCloseConfirmSubnameModal = () => {
    setIsConfirmSubnameModalOpen(false);
    setPendingSubname("");
    setPendingRecipientAddress("");
  };

  const handleSubnameCreation = async () => {
    if (!name || !pendingSubname) return;

    // Close confirmation modal and show progress modal
    setIsConfirmSubnameModalOpen(false);
    setIsSubnameProgressModalOpen(true);
  };

  const handleSubnameProgressComplete = () => {
    // Close progress modal and navigate to the new subname's profile page
    setIsSubnameProgressModalOpen(false);
    navigate(`/${pendingSubname}.${name}`);
    setPendingSubname("");
    setPendingRecipientAddress("");
  };

  const handleCloseSubnameProgressModal = () => {
    setIsSubnameProgressModalOpen(false);
    setPendingSubname("");
    setPendingRecipientAddress("");
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

  const paginateBio = (bioText: string): string[] => {
    if (!bioText || bioText.length === 0) {
      return [];
    }

    const pages: string[] = [];
    let remainingText = bioText;

    while (remainingText.length > 0) {
      // Check byte length instead of character length for accurate 256-byte limit
      const remainingBytes = Buffer.byteLength(remainingText, "utf8");

      if (remainingBytes <= 256) {
        pages.push(remainingText);
        break;
      } else {
        // Start with a conservative estimate
        let cutPoint = Math.floor(remainingText.length * 0.7);
        let testText = remainingText.substring(0, cutPoint);

        // Binary search to find the exact cut point that fits in 256 bytes
        while (Buffer.byteLength(testText, "utf8") > 256 && cutPoint > 0) {
          cutPoint = Math.floor(cutPoint * 0.8);
          testText = remainingText.substring(0, cutPoint);
        }

        // Now we have a cut point that fits in 256 bytes, but we need to ensure
        // we don't cut in the middle of a multi-byte character
        while (cutPoint > 0 && cutPoint < remainingText.length) {
          const charAtCut = remainingText[cutPoint];
          const charBeforeCut = remainingText[cutPoint - 1];

          // Check if we're in the middle of a multi-byte character
          // UTF-8 continuation bytes start with 10xxxxxx (0x80-0xBF)
          const charCode = charAtCut.charCodeAt(0);
          const prevCharCode = charBeforeCut.charCodeAt(0);

          if (charCode >= 0x80 && charCode <= 0xbf) {
            // We're in the middle of a multi-byte character, move back
            cutPoint--;
            testText = remainingText.substring(0, cutPoint);

            // Re-check byte length after moving back
            if (Buffer.byteLength(testText, "utf8") > 256) {
              cutPoint = Math.floor(cutPoint * 0.9);
              testText = remainingText.substring(0, cutPoint);
              continue;
            }
          } else {
            break; // We're at a safe cut point
          }
        }

        // Try to find a better break point (newline or space)
        let bestCutPoint = cutPoint;

        // Look for newlines first (prefer breaking at paragraph boundaries)
        const lastNewline = remainingText.lastIndexOf("\n", cutPoint);
        if (lastNewline > cutPoint * 0.5) {
          // Only if it's not too far back
          const newlineText = remainingText.substring(0, lastNewline);
          if (Buffer.byteLength(newlineText, "utf8") <= 256) {
            bestCutPoint = lastNewline;
          }
        }

        // If no good newline, look for spaces
        if (bestCutPoint === cutPoint) {
          const lastSpace = remainingText.lastIndexOf(" ", cutPoint);
          if (lastSpace > cutPoint * 0.6) {
            // Only if it's not too far back
            const spaceText = remainingText.substring(0, lastSpace);
            if (Buffer.byteLength(spaceText, "utf8") <= 256) {
              bestCutPoint = lastSpace;
            }
          }
        }

        pages.push(remainingText.substring(0, bestCutPoint));
        remainingText = remainingText.substring(bestCutPoint).trim();
      }
    }

    return pages;
  };

  const validateBio = (bioPages: string[]) => {
    for (let i = 0; i < bioPages.length; i++) {
      const pageBytes = Buffer.byteLength(bioPages[i], "utf8");
      if (pageBytes > 256) {
        setBioError(
          `Bio page ${
            i + 1
          } must be 256 bytes or less (currently ${pageBytes} bytes)`
        );
        return false;
      }
    }
    setBioError("");
    return true;
  };

  const loadBioPages = async (
    name: string,
    resolverInstance: ResolverService
  ) => {
    const pages: string[] = [];

    // Load main bio page
    const mainBio = await resolverInstance.text(name, "bio");
    if (mainBio) {
      pages.push(mainBio);
    }

    // Load extended bio pages
    let pageNum = 2;
    while (true) {
      const extBio = await resolverInstance.text(name, `bio.ext.${pageNum}`);
      if (extBio) {
        pages.push(extBio);
        pageNum++;
      } else {
        break; // Gap found, stop loading
      }
    }

    return pages;
  };

  const validateGithubUsername = async (username: string) => {
    if (!username || username.trim() === "") {
      setGithubValidationStatus("idle");
      return;
    }

    setGithubValidationStatus("validating");

    try {
      // Clean the username (remove @ and trim)
      const cleanUsername = username.replace(/^@/, "").trim();

      // Use GitHub API to check if the user exists
      const response = await fetch(
        `https://api.github.com/users/${cleanUsername}`
      );

      if (response.ok) {
        const userData = await response.json();
        // GitHub user exists and is valid
        setGithubValidationStatus("valid");
      } else {
        setGithubValidationStatus("invalid");
      }
    } catch (error) {
      console.error("Error validating GitHub username:", error);
      setGithubValidationStatus("invalid");
    }
  };

  const verifyGithubProfile = async (username: string): Promise<boolean> => {
    if (!username || username.trim() === "" || !name) {
      return false;
    }

    try {
      // Clean the username (remove @ and trim)
      const cleanUsername = username.replace(/^@/, "").trim();

      // Use GitHub API to check if the user exists and has the correct website
      const response = await fetch(
        `https://api.github.com/users/${cleanUsername}`
      );

      if (response.ok) {
        const userData = await response.json();
        const expectedUrl = `https://app.envoi.sh/#/${name}`;

        // Debug logging
        console.log("GitHub API response:", userData);
        console.log("Expected URL:", expectedUrl);
        console.log("Actual blog field:", userData.blog);

        // Check if the user's website/blog field matches the Envoi profile
        const isMatch =
          userData.blog === expectedUrl ||
          userData.blog === expectedUrl + ".voi";
        console.log("Verification result:", isMatch);

        return isMatch;
      }

      return false;
    } catch (error) {
      console.error("Error verifying GitHub profile:", error);
      return false;
    }
  };

  const fetchGithubContributions = async (username: string) => {
    if (!username || username.trim() === "") {
      return;
    }

    try {
      const cleanUsername = username.replace(/^@/, "").trim();
      const allEvents: any[] = [];
      let page = 1;
      const perPage = 100;
      const maxPages = 10; // Limit to prevent excessive API calls

      // Calculate cutoff date (90 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      while (page <= maxPages) {
        const response = await fetch(
          `https://api.github.com/users/${cleanUsername}/events/public?per_page=${perPage}&page=${page}`
        );

        if (!response.ok) break;

        const events = await response.json();
        if (events.length === 0) break; // No more events

        // Filter events to only include those within the last 90 days
        const recentEvents = events.filter((event: any) => {
          const eventDate = new Date(event.created_at);
          return eventDate >= cutoffDate;
        });

        allEvents.push(...recentEvents);

        // If we got fewer events than requested, we've reached the end
        if (events.length < perPage) break;

        // If the oldest event in this batch is older than 90 days, we can stop
        const oldestEvent = events[events.length - 1];
        const oldestEventDate = new Date(oldestEvent.created_at);
        if (oldestEventDate < cutoffDate) break;

        page++;
      }

      console.log(`Fetched ${allEvents.length} events across ${page} pages`);
      console.log("Sample events:", allEvents.slice(0, 3));

      // Process events to create contribution data
      const contributions = allEvents.reduce((acc: any, event: any) => {
        const date = new Date(event.created_at).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date]++;
        return acc;
      }, {});

      console.log("Contribution data:", contributions);

      // Convert to array format for heatmap
      const contributionArray = Object.entries(contributions).map(
        ([date, count]) => ({
          date,
          count: count as number,
        })
      );

      console.log("Contribution array:", contributionArray);

      setGithubContributions(contributionArray);
      setShowContributions(true);
    } catch (error) {
      console.error("Error fetching GitHub contributions:", error);
    }
  };

  const ContributionHeatmap = ({ contributions }: { contributions: any[] }) => {
    const getIntensityColor = (count: number) => {
      if (count === 0) return "#ebedf0";
      if (count === 1) return "#c6e48b";
      if (count === 2) return "#7bc96f";
      if (count === 3) return "#239a3b";
      if (count === 4) return "#196127";
      return "#0d4429"; // Darker green for 5+ contributions
    };

    const generateLast90Days = () => {
      const days = [];
      const today = new Date();

      for (let i = 89; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split("T")[0]);
      }

      return days;
    };

    const last90Days = generateLast90Days();
    const contributionMap = contributions.reduce((acc, contrib) => {
      acc[contrib.date] = contrib.count;
      return acc;
    }, {} as any);

    console.log(
      "Last 90 days generated:",
      last90Days.slice(0, 10),
      "...",
      last90Days.slice(-10)
    );
    console.log("Contribution map:", contributionMap);
    console.log("Total contributions:", contributions.length);

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(18, 1fr)",
          gridTemplateRows: "repeat(5, 1fr)",
          gap: "2px",
          maxWidth: "540px",
          height: "150px",
          margin: "16px 0",
        }}
      >
        {last90Days.map((date, index) => {
          const count = contributionMap[date] || 0;
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
          });
          const monthName = dateObj.toLocaleDateString("en-US", {
            month: "short",
          });
          const dayNumber = dateObj.getDate();
          const year = dateObj.getFullYear();

          return (
            <Tooltip
              key={date}
              title={`${dayName}, ${monthName} ${dayNumber}, ${year}: ${count} contribution${
                count !== 1 ? "s" : ""
              }`}
              arrow
              placement="top"
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: getIntensityColor(count),
                  borderRadius: "2px",
                  cursor: "pointer",
                  position: "relative",
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (owner) {
      fetchNFTs(owner);
    }
  }, [isNftModalOpen, owner]);

  // Debounced GitHub validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newGithub) {
        validateGithubUsername(newGithub);
      } else {
        setGithubValidationStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newGithub]);

  // Fetch contributions when GitHub is verified
  useEffect(() => {
    if (github && githubValidationStatus === "valid") {
      fetchGithubContributions(github);
    }
  }, [github, githubValidationStatus]);

  // Also fetch contributions when profile loads and GitHub is available
  useEffect(() => {
    if (github && !showContributions) {
      // Check if GitHub is verified by checking the profile
      const checkAndFetchContributions = async () => {
        try {
          const cleanUsername = github.replace(/^@/, "").trim();
          const response = await fetch(
            `https://api.github.com/users/${cleanUsername}`
          );

          if (response.ok) {
            const userData = await response.json();
            const expectedUrl = `https://app.envoi.sh/#/${name}`;

            // Check if the user's website/blog field matches the Envoi profile
            const isVerified =
              userData.blog === expectedUrl ||
              userData.blog === expectedUrl + ".voi";

            if (isVerified) {
              setGithubValidationStatus("valid");
              fetchGithubContributions(github);
            } else {
              setGithubValidationStatus("invalid");
            }
          }
        } catch (error) {
          console.error("Error checking GitHub verification on load:", error);
          setGithubValidationStatus("invalid");
        }
      };

      checkAndFetchContributions();
    }
  }, [github, name, showContributions]);

  useEffect(() => {
    if (!name || !parentAppId) return;
    (async () => {
      const node = await namehash(name || "");
      const tokenId = uint8ArrayToBigInt(node);
      const arc72 = new ARC72Service(
        "mainnet",
        activeAccount?.address,
        parentAppId
      );
      const owner = await arc72.ownerOf(tokenId);
      setOwner(owner);
      setIsOwner(owner === activeAccount?.address);
    })();
  }, [name, activeAccount, parentAppId]);

  useEffect(() => {
    const registry = new RegistryService("mainnet");
    const registrar = new RegistrarService(
      "mainnet",
      activeAccount?.address,
      parentAppId
    );
    const resolver = new ResolverService("mainnet");

    namehash(name || "").then((nameHash) => {
      const tokenId = uint8ArrayToBigInt(nameHash);
      registrar.expiration(tokenId).then((expiryTimestamp) => {
        if (expiryTimestamp !== false) {
          const expiryTimestampNumber = Number(expiryTimestamp);
          setExpiry(new Date(expiryTimestampNumber * 1000));
        }
      });
      /*
      registrar.ownerOf(tokenId).then((owner) => {
        if (owner != zeroAddress) {
          setOwner(owner);
        } else {
          registry.ownerOf(name || "").then((owner) => {
            setOwner(owner);
          });
        }
      });
      */
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
    loadBioPages(name || "", resolver).then((pages: string[]) => {
      setBioPages(pages);
      setBio(pages.length > 0 ? pages.join("") : null);
    });
    resolver
      .text(name || "", "description")
      .then((description: string | null) => {
        setDescription(description);
      });
    resolver.text(name || "", "display").then((display: string | null) => {
      setDisplay(display);
    });
    resolver
      .text(name || "", "background")
      .then((background: string | null) => {
        setBackground(background);
      });
    resolver.text(name || "", "banner").then((banner: string | null) => {
      setBanner(banner);
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

  const getBackgroundStyle = (backgroundValue: string | null) => {
    if (!backgroundValue) return {};

    // Check if it's a color (starts with # and has 8 hex characters)
    if (backgroundValue.startsWith("#") && backgroundValue.length === 9) {
      return { backgroundColor: backgroundValue };
    }

    // Otherwise treat as URL
    return {
      backgroundImage: `url(${backgroundValue})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
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
    const imageUrl = metadata?.image?.startsWith("ipfs://")
      ? `https://ipfs.io/ipfs/${metadata?.image?.replace("ipfs://", "")}`
      : metadata?.image;
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
          const imageUrl = metadata?.image?.startsWith("ipfs://")
            ? `https://ipfs.io/ipfs/${metadata?.image?.replace("ipfs://", "")}`
            : metadata?.image;
          setProfileImage(imageUrl);
          setSelectedNftId(null); // Reset selection
        } catch (e) {
          console.error("Error parsing NFT metadata:", e);
        }
      }
    }
    setShowNftModal(false);
  };

  // Helper function to format URL for display
  const formatUrlForDisplay = (url: string): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";

    // Add https:// if no protocol is specified
    if (!trimmed.match(/^https?:\/\//)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleSave = async () => {
    // Check for bio validation errors before starting save process
    if (bioError) {
      enqueueSnackbar("Please fix bio validation errors before saving", {
        variant: "error",
      });
      return;
    }

    setIsPendingTx(true);
    try {
      if (!activeAccount) return;

      // Check if GitHub field is being updated and verify ownership
      if (github !== newGithub && newGithub && newGithub.trim() !== "") {
        const isVerified = await verifyGithubProfile(newGithub);
        if (!isVerified) {
          enqueueSnackbar(
            "GitHub profile verification failed. Please ensure your GitHub profile's 'Website' field is set to your Envoi profile URL.",
            { variant: "error" }
          );
          setIsPendingTx(false);
          return;
        }
      }
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
        if (profileImage && name) {
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
      if (twitter !== newTwitter && name) {
        const setTextR: any = await resolver.setText(
          name,
          "com.twitter",
          (newTwitter || "").trim()
        );
        buildN.push(setTextR);
        twitterUpdated = true;
      }
      let githubUpdated = false;
      if (github !== newGithub && name) {
        const setTextR: any = await resolver.setText(
          name,
          "com.github",
          (newGithub || "").trim()
        );
        buildN.push(setTextR);
        githubUpdated = true;
      }

      let urlUpdated = false;
      if (url !== newUrl && name) {
        const formattedUrl = formatUrlForDisplay(newUrl || "");
        const setTextR: any = await resolver.setText(name, "url", formattedUrl);
        buildN.push(setTextR);
        urlUpdated = true;
      }

      let locationUpdated = false;
      if (location !== newLocation && name) {
        const setTextR: any = await resolver.setText(
          name,
          "location",
          newLocation || ""
        );
        buildN.push(setTextR);
        locationUpdated = true;
      }

      let bioUpdated = false;
      if (JSON.stringify(bioPages) !== JSON.stringify(newBioPages) && name) {
        // Validate all bio pages before saving
        if (!validateBio(newBioPages)) {
          enqueueSnackbar(bioError, {
            variant: "error",
          });
          setIsPendingTx(false);
          return;
        }

        // Additional server-side validation for each page
        for (let i = 0; i < newBioPages.length; i++) {
          const pageBytes = Buffer.byteLength(newBioPages[i].trim(), "utf8");
          if (pageBytes > 256) {
            enqueueSnackbar(
              `Bio page ${i + 1} exceeds 256 bytes (${pageBytes} bytes)`,
              {
                variant: "error",
              }
            );
            setIsPendingTx(false);
            return;
          }
        }

        // Save main bio page
        if (newBioPages.length > 0) {
          const setTextR: any = await resolver.setText(
            name,
            "bio",
            newBioPages[0].trim()
          );
          buildN.push(setTextR);
        } else {
          // Clear main bio page if no pages exist
          const clearTextR: any = await resolver.setText(name, "bio", "");
          buildN.push(clearTextR);
        }

        // Save extended bio pages
        for (let i = 1; i < newBioPages.length; i++) {
          const setTextR: any = await resolver.setText(
            name,
            `bio.ext.${i + 1}`,
            newBioPages[i].trim()
          );
          buildN.push(setTextR);
        }

        // Clear any existing pages after the last non-empty page
        // Check if there are any existing pages beyond our current set
        let pageNum = newBioPages.length + 1;
        while (true) {
          const existingPage = await resolver.text(name, `bio.ext.${pageNum}`);
          if (existingPage) {
            // Clear this page by setting it to empty
            const clearTextR: any = await resolver.setText(
              name,
              `bio.ext.${pageNum}`,
              ""
            );
            buildN.push(clearTextR);
            pageNum++;
          } else {
            // No more pages to clear
            break;
          }
        }

        bioUpdated = true;
      }

      let descriptionUpdated = false;
      if (description !== newDescription && name) {
        const setTextR: any = await resolver.setText(
          name,
          "description",
          (newDescription || "").trim()
        );
        buildN.push(setTextR);
        descriptionUpdated = true;
      }

      let displayUpdated = false;
      if (display !== newDisplay && name) {
        const setTextR: any = await resolver.setText(
          name,
          "display",
          (newDisplay || "").trim()
        );
        buildN.push(setTextR);
        displayUpdated = true;
      }

      let backgroundUpdated = false;
      if (background !== newBackground && name) {
        let backgroundValue = (newBackground || "").trim();

        // Auto-add 'ff' to 6-character hex colors (e.g., #d5bba3 -> #d5bba3ff)
        if (backgroundValue.startsWith("#") && backgroundValue.length === 7) {
          backgroundValue = backgroundValue + "ff";
        }

        const setTextR: any = await resolver.setText(
          name,
          "background",
          backgroundValue
        );
        buildN.push(setTextR);
        backgroundUpdated = true;
      }

      let bannerUpdated = false;
      if (banner !== newBanner && name) {
        let bannerValue = (newBanner || "").trim();

        // Auto-add 'ff' to 6-character hex colors (e.g., #d5bba3 -> #d5bba3ff)
        if (bannerValue.startsWith("#") && bannerValue.length === 7) {
          bannerValue = bannerValue + "ff";
        }

        const setTextR: any = await resolver.setText(
          name,
          "banner",
          bannerValue
        );
        buildN.push(setTextR);
        bannerUpdated = true;
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

      if (bioUpdated) {
        const newBioPagesData = await loadBioPages(name || "", resolver);
        setBioPages(newBioPagesData);
        setBio(newBioPagesData.length > 0 ? newBioPagesData.join("") : null);
      }

      if (descriptionUpdated) {
        let newDescriptionText = await resolver.text(name || "", "description");
        do {
          if (newDescriptionText !== description) {
            break;
          }
          newDescriptionText = await resolver.text(name || "", "description");
        } while (1);
        setDescription(newDescriptionText);
      }

      if (displayUpdated) {
        let newDisplayText = await resolver.text(name || "", "display");
        do {
          if (newDisplayText !== display) {
            break;
          }
          newDisplayText = await resolver.text(name || "", "display");
        } while (1);
        setDisplay(newDisplayText);
      }

      if (backgroundUpdated) {
        let newBackgroundText = await resolver.text(name || "", "background");
        do {
          if (newBackgroundText !== background) {
            break;
          }
          newBackgroundText = await resolver.text(name || "", "background");
        } while (1);
        setBackground(newBackgroundText);
      }

      if (bannerUpdated) {
        let newBannerText = await resolver.text(name || "", "banner");
        do {
          if (newBannerText !== banner) {
            break;
          }
          newBannerText = await resolver.text(name || "", "banner");
        } while (1);
        setBanner(newBannerText);
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
      case "bio":
        if (!newBio) {
          setNewBio(" ");
          setNewBioPages([""]);
        }
        break;
      case "description":
        if (!newDescription) setNewDescription(" ");
        break;
      case "display":
        if (!newDisplay) setNewDisplay(" ");
        break;
      case "background":
        if (!newBackground) setNewBackground(" ");
        break;
      case "banner":
        if (!newBanner) setNewBanner(" ");
        break;
      // Add more cases for other fields as needed
    }
    handleCloseFieldCatalog();
  };

  const filteredFields = AVAILABLE_FIELDS.filter((field) =>
    field.label.toLowerCase().includes(fieldSearchQuery.toLowerCase())
  );

  // Console log for inspection - always visible
  console.log("=== PROFILE FIELDS DEBUG ===");
  console.log("AVAILABLE_FIELDS:", AVAILABLE_FIELDS);
  console.log("Current Field Values:", {
    twitter,
    github,
    location,
    url,
    bio,
    background,
    banner,
  });
  console.log("Field Search Query:", fieldSearchQuery);
  console.log("Filtered Fields:", filteredFields);
  console.log("=== END DEBUG ===");

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
    if (!name) {
      enqueueSnackbar("Please enter a name to extend", {
        variant: "error",
      });
      return;
    }
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
        registrar: parentAppId,
        resolver: 797608,
      };

      const tok = {
        tokenId: paymentToken,
        decimals: paymentTokenDecimals,
        symbol: paymentTokenSymbol,
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
          tok.tokenId,
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
      for (const p of [
        [0, 0],
        [0, 1],
        [1, 1],
      ]) {
        const [p0, p1] = p;
        const buildN = [];

        // Create wVOI Balance for user if needed
        if (p0 > 0) {
          const txnO = (
            await builder.arc200.createBalanceBox(activeAccount.address)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 28500,
            note: new TextEncoder().encode(
              `envoi createBalanceBox ${paymentAmount} VOI for ${name}.${parentName} extension`
            ),
          });
        }

        // Deposit VOI (NET -> ARC200)
        if (p1 > 0) {
          const txnO = (
            await builder.arc200.deposit(paymentAmount * 10 ** tok.decimals)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: paymentAmount * 10 ** tok.decimals,
            note: new TextEncoder().encode(
              `envoi deposit ${paymentAmount} VOI for ${name}.voi extension`
            ),
          });
        }

        // Approve spending
        {
          const paramSpender = algosdk.getApplicationAddress(vns.registrar);
          const paramAmount = paymentAmount * 10 ** tok.decimals;
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
          const label = name.split(".")[0];
          const paramName = stringToUint8Array(label, 32);
          const paramDuration = Number(selectedDuration) * 365 * 24 * 60 * 60; // Convert years to seconds
          const txnO = (await builder.registrar.renew())?.obj;
          buildN.push({
            ...txnO,
            payment: 336700,
            note: new TextEncoder().encode(
              `envoi registrar extend ${name}.${parentName} for ${selectedDuration} years`
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
        registrar: parentAppId,
        registry: 797607,
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
        registry: new CONTRACT(
          vns.registry,
          algodClient,
          indexerClient,
          { ...VNSRegistrySpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // Get the token ID for the name
      const node = await namehash(name || "");
      const tokenId = uint8ArrayToBigInt(node);

      // registry transfer node to new owner
      {
        const txnO = await builder.registry.setOwner(
          node,
          newOwnerForTransfer || ""
        );
        buildN.push({
          ...txnO.obj,
          note: new TextEncoder().encode(
            `registry transfer ${name}.voi to ${newOwnerForTransfer}`
          ),
        });
      }
      // registrar transfer token to new owner
      {
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
      }

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

  const handleSetAsDefault = async () => {
    setIsPendingTx(true);
    try {
      if (!activeAccount) {
        enqueueSnackbar("Please connect your wallet to set default name", {
          variant: "error",
        });
        return;
      }

      const { algodClient, indexerClient } = getAlgorandClients();

      const vns = {
        registry: 797607,
        resolver: 797608,
        registrar: parentAppId,
        reverseRegistrar: 797610,
      };

      const ci = new CONTRACT(
        parentAppId,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      const ciReverseRegistrar = new CONTRACT(
        vns.reverseRegistrar,
        algodClient,
        indexerClient,
        { ...VNSRegistrarSpec.contract, events: [] },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      const ciResolver = new CONTRACT(
        vns.resolver,
        algodClient,
        indexerClient,
        { ...VNSPublicResolverSpec.contract, events: [] },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      const ciRegistry = new CONTRACT(
        vns.registry,
        algodClient,
        indexerClient,
        { ...VNSRegistrySpec.contract, events: [] },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      const builder = {
        registry: new CONTRACT(
          vns.registry,
          algodClient,
          indexerClient,
          {
            name: "registry",
            description: "Registry",
            methods: VNSRegistrySpec.contract.methods,
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
        registrar: new CONTRACT(
          vns.registrar,
          algodClient,
          indexerClient,
          { ...VNSRegistrarSpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
        reverseRegistrar: new CONTRACT(
          vns.reverseRegistrar,
          algodClient,
          indexerClient,
          { ...VNSRegistrarSpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
        resolver: new CONTRACT(
          vns.resolver,
          algodClient,
          indexerClient,
          {
            name: "resolver",
            description: "Resolver",
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

      // -----------------------------------------

      const buildN = [];

      // Check if reverse node exists, if not create it
      {
        const node = await namehash(`${activeAccount.address}.addr.reverse`);
        const ownerOfR = await ciRegistry.ownerOf(node);
        if (!ownerOfR.success) {
          throw new Error("Failed to get owner of reverse address node");
        }
        const reverNodeOwner = ownerOfR.returnValue;
        if (!ownerOfR.success || reverNodeOwner === zeroAddress) {
          const txnO = (
            await builder.reverseRegistrar.register(
              algosdk.decodeAddress(activeAccount.address).publicKey,
              activeAccount.address,
              0
            )
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 28500,
            note: new TextEncoder().encode(
              `envoi register ${activeAccount.address}.addr.reverse`
            ),
          });
        }
      }

      // Set name with resolver
      {
        const nameR = await ciResolver.name(
          await namehash(`${activeAccount.address}.addr.reverse`)
        );
        if (!nameR.success) {
          throw new Error("Failed to get name of reverse address node");
        }
        console.log(
          `name(${activeAccount.address}.addr.reverse)`,
          stripTrailingZeroBytes(nameR.returnValue)
        );
        const txnO = (
          await builder.resolver.setName(
            await namehash(`${activeAccount.address}.addr.reverse`),
            stringToUint8Array(`${name}`)
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `envoi resolver setName ${activeAccount.address}.addr.reverse ${name}`
          ),
        });
      }

      // reclaim name
      {
        const nodeOwnerR = await ciRegistry.ownerOf(await namehash(name || ""));
        if (!nodeOwnerR.success) {
          throw new Error("Failed to get owner of node");
        }
        const nodeOwner = nodeOwnerR.returnValue;
        if (nodeOwner !== activeAccount.address) {
          const subname = name?.split(".")[0] || "";
          const txnO = (
            await builder.registrar.reclaim(stringToUint8Array(subname, 32))
          )?.obj;
          buildN.push({
            ...txnO,
            note: new TextEncoder().encode(`envoi registrar reclaim ${name}`),
          });
        }
      }

      // set record name in resolver
      {
        const paramNode = await namehash(`${name}`);
        const paramName = stringToUint8Array(`${name}`, 256);
        const nameR = await ciResolver.name(await namehash(`${name}`));
        if (!nameR.success) {
          throw new Error("Failed to get name of node");
        }
        const nameN = stripTrailingZeroBytes(nameR.returnValue);
        if (nameN !== name) {
          const txnO = (await builder.resolver.setName(paramNode, paramName))
            ?.obj;
          buildN.push({
            ...txnO,
            payment: 336701,
            note: new TextEncoder().encode(`envoi resolver setName ${name}`),
          });
        }
      }

      //ci.setBeaconId(vns.reverseRegistrar);
      ci.setFee(2000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);

      const customR = await ci.custom();

      console.log("customR", customR);

      if (!customR.success) {
        throw new Error("Failed to set default name");
      }

      const stxns = await signTransactions(
        customR.txns.map((t: string) => {
          return new Uint8Array(Buffer.from(t, "base64"));
        })
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      enqueueSnackbar(`${name} has been set as your default name!`, {
        variant: "success",
      });
      setIsSetDefaultModalOpen(false);
    } catch (error) {
      console.error("Error setting default name:", error);
      enqueueSnackbar("Failed to set default name. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsPendingTx(false);
    }
  };

  const handleMint = async () => {
    setIsPendingTx(true);
    try {
      if (!activeAccount) {
        enqueueSnackbar("Please connect your wallet to mint a name", {
          variant: "error",
        });
        return;
      }

      if (!mintToAddress.trim()) {
        enqueueSnackbar("Please enter a recipient address", {
          variant: "error",
        });
        return;
      }

      if (!name) {
        enqueueSnackbar("Please enter a name to mint", {
          variant: "error",
        });
        return;
      }

      // Validate address
      try {
        algosdk.decodeAddress(mintToAddress);
      } catch {
        enqueueSnackbar("Please enter a valid Algorand address", {
          variant: "error",
        });
        return;
      }

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        parentAppId,
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
          parentAppId,
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

      // Mint the name
      const txnO = await builder.registrar.mint(
        mintToAddress,
        stringToUint8Array(name?.split(".")[0] || "", 32)
      );
      buildN.push({
        ...txnO.obj,
        payment: 28500,
        note: new TextEncoder().encode(
          `envoi mint ${name} to ${mintToAddress}`
        ),
      });

      ci.setFee(15000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);

      const customR = await ci.custom();

      console.log("customR", customR);

      if (!customR.success) {
        throw new Error("Failed to mint name");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      enqueueSnackbar(`Successfully minted ${name}!`, {
        variant: "success",
      });
      setIsMintModalOpen(false);
      setMintToAddress("");
    } catch (error) {
      console.error("Error minting name:", error);
      enqueueSnackbar("Failed to mint name. Please try again.", {
        variant: "error",
      });
    } finally {
      setIsPendingTx(false);
    }
  };

  return (
    <div
      className="profile-container"
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        paddingBottom: "4rem",
        backgroundColor:
          background && background.startsWith("#") && background.length === 9
            ? background
            : undefined,
        backgroundImage:
          background && !background.startsWith("#")
            ? `url(${background})`
            : undefined,
        backgroundSize:
          background && !background.startsWith("#") ? "cover" : undefined,
        backgroundPosition:
          background && !background.startsWith("#") ? "center" : undefined,
        backgroundRepeat:
          background && !background.startsWith("#") ? "no-repeat" : undefined,
      }}
    >
      <div
        style={{
          minHeight: "280px",
          width: "100%",
          padding: "2rem",
          paddingBottom: "4rem",
          position: "relative",
          backgroundColor:
            banner && banner.startsWith("#") && banner.length === 9
              ? banner
              : undefined,
          backgroundImage:
            banner && !banner.startsWith("#") ? `url(${banner})` : undefined,
          backgroundSize:
            banner && !banner.startsWith("#") ? "cover" : undefined,
          backgroundPosition:
            banner && !banner.startsWith("#") ? "center" : undefined,
          backgroundRepeat:
            banner && !banner.startsWith("#") ? "no-repeat" : undefined,
          background: banner
            ? banner.startsWith("#") && banner.length === 9
              ? banner
              : `url(${banner})`
            : "var(--banner-gradient)",
        }}
      >
        <div className="banner-content">
          <Avatar
            sx={{ width: 120, height: 120, bgcolor: "#3B82F6" }}
            className="profile-avatar"
            src={avatarText || undefined}
          >
            {name?.charAt(0).toUpperCase()}
          </Avatar>
          <h1 className="profile-name">{display || name}</h1>
          {(isOwner || isController) && (
            <div
              style={{
                position: "absolute",
                right: "1rem",
                top: "1rem",
                display: "flex",
                gap: "0.5rem",
              }}
            >
              {false && isController && nodeOwner === zeroAddress && (
                <Button
                  variant="contained"
                  onClick={() => setIsMintModalOpen(true)}
                  sx={{
                    bgcolor:
                      theme.palette.mode === "dark" ? "#374151" : "white",
                    color:
                      theme.palette.mode === "dark" ? "#F9FAFB" : "#10B981",
                    "&:hover": {
                      bgcolor:
                        theme.palette.mode === "dark" ? "#4B5563" : "#F0FDF4",
                    },
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 2px 4px rgba(0, 0, 0, 0.3)"
                        : "0 2px 4px rgba(0, 0, 0, 0.1)",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid #4B5563"
                        : "none",
                  }}
                >
                  Mint
                  <PlusIcon />
                </Button>
              )}
              {isOwner && (
                <>
                  <Button
                    variant="contained"
                    onClick={handleExtend}
                    sx={{
                      bgcolor:
                        theme.palette.mode === "dark" ? "#374151" : "white",
                      color:
                        theme.palette.mode === "dark" ? "#F9FAFB" : "#8B5CF6",
                      "&:hover": {
                        bgcolor:
                          theme.palette.mode === "dark" ? "#4B5563" : "#F5F3FF",
                      },
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 2px 4px rgba(0, 0, 0, 0.3)"
                          : "0 2px 4px rgba(0, 0, 0, 0.1)",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid #4B5563"
                          : "none",
                    }}
                  >
                    Extend
                    <FastForwardIcon />
                  </Button>
                  {!subnameRegistrar && (
                    <Button
                      variant="contained"
                      onClick={handleOpenTransferModal}
                      sx={{
                        bgcolor:
                          theme.palette.mode === "dark" ? "#374151" : "white",
                        color:
                          theme.palette.mode === "dark" ? "#F9FAFB" : "#EF4444",
                        "&:hover": {
                          bgcolor:
                            theme.palette.mode === "dark"
                              ? "#4B5563"
                              : "#FEF2F2",
                        },
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        fontWeight: "600",
                        fontSize: "0.875rem",
                        boxShadow:
                          theme.palette.mode === "dark"
                            ? "0 2px 4px rgba(0, 0, 0, 0.3)"
                            : "0 2px 4px rgba(0, 0, 0, 0.1)",
                        border:
                          theme.palette.mode === "dark"
                            ? "1px solid #4B5563"
                            : "none",
                      }}
                    >
                      Transfer
                      <SendIcon />
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleCreateSubname}
                    sx={{
                      bgcolor:
                        theme.palette.mode === "dark" ? "#374151" : "white",
                      color:
                        theme.palette.mode === "dark" ? "#F9FAFB" : "#10B981",
                      "&:hover": {
                        bgcolor:
                          theme.palette.mode === "dark" ? "#4B5563" : "#F0FDF4",
                      },
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 2px 4px rgba(0, 0, 0, 0.3)"
                          : "0 2px 4px rgba(0, 0, 0, 0.1)",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid #4B5563"
                          : "none",
                    }}
                  >
                    New Subname
                    <PlusIcon size={16} />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Social Network Style Profile Layout */}
      <div
        className="profile-content"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "2rem 1rem 4rem 1rem",
        }}
      >
        {/* Check if there are any visible sections */}
        {(() => {
          const hasVisibleSections =
            description ||
            bio ||
            twitter ||
            github ||
            url ||
            location ||
            (showContributions && githubContributions.length > 0);

          if (hasVisibleSections) {
            return (
              <>
                {/* Description Section */}
                {description && (
                  <div
                    style={{
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
                      borderRadius: "12px",
                      padding: "1rem",
                      marginBottom: "1rem",
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
                          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid #374151"
                          : "1px solid #E5E7EB",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color:
                          theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                        fontWeight: 500,
                        fontSize: "1.1rem",
                        lineHeight: 1.4,
                      }}
                    >
                      {description}
                    </Typography>
                  </div>
                )}

                {/* Bio Section */}
                {bio && (
                  <div
                    style={{
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      marginBottom: "1rem",
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
                          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid #374151"
                          : "1px solid #E5E7EB",
                    }}
                  >
                    <div
                      style={{
                        color:
                          theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                        lineHeight: 1.6,
                        fontSize: "1rem",
                      }}
                    >
                      <MDEditor.Markdown
                        source={bio}
                        data-color-mode={theme.palette.mode}
                        style={{
                          backgroundColor: "transparent",
                          color: "inherit",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Social Links Section */}
                <div
                  style={{
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    marginBottom: "1rem",
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
                        : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid #374151"
                        : "1px solid #E5E7EB",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                      marginBottom: "1rem",
                      fontWeight: 600,
                    }}
                  >
                    Links
                  </Typography>

                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}
                  >
                    {twitter && (
                      <a
                        href={`https://twitter.com/${twitter.replace(" ", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.75rem 1rem",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "#374151"
                              : "#F3F4F6",
                          borderRadius: "8px",
                          textDecoration: "none",
                          color:
                            theme.palette.mode === "dark"
                              ? "#F9FAFB"
                              : "#111827",
                          transition: "all 0.2s",
                          border:
                            theme.palette.mode === "dark"
                              ? "1px solid #4B5563"
                              : "1px solid #E5E7EB",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.palette.mode === "dark"
                              ? "#4B5563"
                              : "#E5E7EB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.palette.mode === "dark"
                              ? "#374151"
                              : "#F3F4F6";
                        }}
                      >
                        <TwitterIcon sx={{ color: "#1DA1F2" }} />
                        <span>@{twitter.replace(" ", "")}</span>
                      </a>
                    )}

                    {github && (
                      <a
                        href={`https://github.com/${github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.75rem 1rem",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "#374151"
                              : "#F3F4F6",
                          borderRadius: "8px",
                          textDecoration: "none",
                          color:
                            theme.palette.mode === "dark"
                              ? "#F9FAFB"
                              : "#111827",
                          transition: "all 0.2s",
                          border:
                            theme.palette.mode === "dark"
                              ? "1px solid #4B5563"
                              : "1px solid #E5E7EB",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.palette.mode === "dark"
                              ? "#4B5563"
                              : "#E5E7EB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.palette.mode === "dark"
                              ? "#374151"
                              : "#F3F4F6";
                        }}
                      >
                        <GitHubIcon
                          sx={{
                            color:
                              theme.palette.mode === "dark"
                                ? "#F9FAFB"
                                : "#111827",
                          }}
                        />
                        <span>@{github}</span>
                      </a>
                    )}

                    {url && (
                      <a
                        href={formatUrlForDisplay(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.75rem 1rem",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "#374151"
                              : "#F3F4F6",
                          borderRadius: "8px",
                          textDecoration: "none",
                          color:
                            theme.palette.mode === "dark"
                              ? "#F9FAFB"
                              : "#111827",
                          transition: "all 0.2s",
                          border:
                            theme.palette.mode === "dark"
                              ? "1px solid #4B5563"
                              : "1px solid #E5E7EB",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.palette.mode === "dark"
                              ? "#4B5563"
                              : "#E5E7EB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.palette.mode === "dark"
                              ? "#374151"
                              : "#F3F4F6";
                        }}
                      >
                        <LinkIcon sx={{ color: "#3B82F6" }} />
                        <span>
                          {formatUrlForDisplay(url).replace("https://", "")}
                        </span>
                      </a>
                    )}

                    {location && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.75rem 1rem",
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "#374151"
                              : "#F3F4F6",
                          borderRadius: "8px",
                          color:
                            theme.palette.mode === "dark"
                              ? "#F9FAFB"
                              : "#111827",
                          border:
                            theme.palette.mode === "dark"
                              ? "1px solid #4B5563"
                              : "1px solid #E5E7EB",
                        }}
                      >
                        <LocationOnIcon sx={{ color: "#EF4444" }} />
                        <span>{location}</span>
                      </div>
                    )}
                  </div>

                  {/* GitHub Contributions */}
                  {showContributions && githubContributions.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color:
                            theme.palette.mode === "dark"
                              ? "#F9FAFB"
                              : "#111827",
                          marginBottom: "1rem",
                          fontWeight: 600,
                        }}
                      >
                        GitHub Activity
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            theme.palette.mode === "dark"
                              ? "#D1D5DB"
                              : "#6B7280",
                          fontSize: "0.75rem",
                          marginBottom: "8px",
                          display: "block",
                        }}
                      >
                        Contribution Activity (Last 90 days)
                      </Typography>
                      <ContributionHeatmap
                        contributions={githubContributions}
                      />
                    </div>
                  )}
                </div>
              </>
            );
          }
        })()}

        {/* Profile Details Section - Always visible */}
        <div
          style={{
            backgroundColor:
              theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "1rem",
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #374151"
                : "1px solid #E5E7EB",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Profile Details
          </Typography>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                }}
              >
                Owner Address
              </Typography>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    color:
                      theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                  }}
                >
                  {owner
                    ? `${owner.slice(0, 6)}...${owner.slice(-4)}`
                    : "Loading..."}
                </Typography>
                <button
                  onClick={() => {
                    if (owner) {
                      navigator.clipboard.writeText(owner);
                      enqueueSnackbar("Address copied to clipboard!", {
                        variant: "success",
                      });
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </button>
                <a
                  href={`${explorerBaseUrl}/account/${owner}/transactions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color:
                      theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                    textDecoration: "none",
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </a>
              </div>
            </div>

            {expiry && new Date(expiry).getTime() > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                  }}
                >
                  Expiry
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                  }}
                >
                  {formatExpiry(expiry)}
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Owner Controls Section - Only visible to owner */}
        {isOwner && (
          <div
            style={{
              backgroundColor:
                theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
              borderRadius: "12px",
              padding: "1.5rem",
              marginBottom: "1rem",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid #374151"
                  : "1px solid #E5E7EB",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              Profile Management
            </Typography>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <Button
                variant="outlined"
                onClick={handleOpenEditModal}
                sx={{
                  borderColor:
                    theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
                  color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                  "&:hover": {
                    borderColor:
                      theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
                  },
                }}
              >
                Edit Profile
              </Button>

              <Button
                variant="outlined"
                onClick={() => setIsSetDefaultModalOpen(true)}
                sx={{
                  borderColor:
                    theme.palette.mode === "dark" ? "#4B5563" : "#D1D5DB",
                  color: theme.palette.mode === "dark" ? "#F9FAFB" : "#111827",
                  "&:hover": {
                    borderColor:
                      theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
                  },
                }}
              >
                Set as Default
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        aria-labelledby="edit-profile-modal"
      >
        <Box
          className="edit-modal"
          sx={{
            bgcolor: theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
            color: theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
            "& h2": {
              color: theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
            },
            "& .text-fields-container": {
              "& .field-wrapper": {
                "& .MuiTextField-root": {
                  "& .MuiInputLabel-root": {
                    color:
                      theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
                  },
                  "& .MuiOutlinedInput-root": {
                    color:
                      theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        theme.palette.mode === "dark" ? "#374151" : "#D1D5DB",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        theme.palette.mode === "dark" ? "#6B7280" : "#9CA3AF",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
                    },
                  },
                },
              },
            },
            "& .modal-buttons": {
              "& .cancel-button": {
                color: theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
                borderColor:
                  theme.palette.mode === "dark" ? "#374151" : "#D1D5DB",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#374151" : "#F9FAFB",
                },
              },
              "& .save-button": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "#3B82F6" : "#3B82F6",
                color: "#FFFFFF",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#2563EB" : "#2563EB",
                },
              },
            },
          }}
        >
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
                  onChange={(e) =>
                    setNewTwitter(
                      e.target.value.includes("/")
                        ? e.target.value
                            .replace(/\/+$/, "")
                            .split("/")
                            .pop()
                            ?.trim() || ""
                        : e.target.value.replace(/^@/, "").trim()
                    )
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
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
                  onChange={(e) => setNewGithub(e.target.value.trim())}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {githubValidationStatus === "validating" && (
                          <CircularProgress size={20} />
                        )}
                        {githubValidationStatus === "valid" && (
                          <CheckCircleIcon sx={{ color: "green" }} />
                        )}
                        {githubValidationStatus === "invalid" && (
                          <ErrorIcon sx={{ color: "red" }} />
                        )}
                      </InputAdornment>
                    ),
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

            {newGithub && newGithub.trim() !== "" && (
              <div style={{ marginTop: "8px", marginBottom: "16px" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                    fontSize: "0.75rem",
                  }}
                >
                  <strong>Verification Required:</strong> To update your GitHub,
                  your GitHub profile's Website must be set to:
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "monospace",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                    color:
                      theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    display: "block",
                    marginTop: "4px",
                    fontSize: "0.75rem",
                  }}
                >
                  https://app.envoi.sh/#/{name}
                </Typography>
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
                  onChange={(e) => setNewUrl(e.target.value.trim())}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
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
                  }}
                  InputProps={{
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

            {newBio && (
              <div className="field-wrapper">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <Typography variant="h6">Bio</Typography>
                  <Button
                    sx={{ minWidth: "auto", height: "40px" }}
                    onClick={() => {
                      setNewBio("");
                      setNewBioPages([]);
                      setBioError("");
                    }}
                    color="error"
                    variant="outlined"
                  >
                    <DeleteIcon />
                  </Button>
                </div>

                <div
                  style={{
                    border: bioError ? "1px solid #d32f2f" : "1px solid #ccc",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <MDEditor
                    value={newBio || ""}
                    onChange={(value) => {
                      const markdownValue = value || "";
                      setNewBio(markdownValue);
                      // Automatically paginate the markdown bio behind the scenes
                      const pages = paginateBio(markdownValue);
                      setNewBioPages(pages);
                      validateBio(pages);
                    }}
                    preview="edit"
                    hideToolbar={false}
                    data-color-mode={theme.palette.mode}
                    height={300}
                    textareaProps={{
                      placeholder:
                        "Tell us about yourself... You can use **bold**, *italic*, [links](https://example.com), and more markdown formatting!",
                    }}
                  />
                </div>

                {bioError && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {bioError}
                  </Typography>
                )}

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {`${(newBio || "").length} characters, ${Buffer.byteLength(
                    newBio || "",
                    "utf8"
                  )} bytes${
                    newBioPages.length > 1
                      ? ` (${newBioPages.length} pages)`
                      : ""
                  }`}
                </Typography>
              </div>
            )}

            {newDescription && (
              <div
                className="field-wrapper"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <TextField
                  fullWidth
                  id="description"
                  label="Description"
                  placeholder="Short tagline or description"
                  variant="outlined"
                  margin="normal"
                  value={newDescription || ""}
                  onChange={(e) => setNewDescription(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
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
                    setNewDescription("");
                  }}
                >
                  <DeleteIcon />
                </Button>
              </div>
            )}

            {newDisplay && (
              <div className="field-wrapper">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <Typography variant="h6">Display Name</Typography>
                  <Button
                    sx={{ minWidth: "auto", height: "40px" }}
                    onClick={() => {
                      setNewDisplay("");
                    }}
                    color="error"
                    variant="outlined"
                  >
                    <DeleteIcon />
                  </Button>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <Typography variant="body2" color="text.secondary">
                    Click on any character to change its case. This is your
                    preferred display form.
                  </Typography>
                </div>

                <div
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "12px",
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#1F2937" : "#FFFFFF",
                    minHeight: "60px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  {(newDisplay || "").split("").map((char, index) => (
                    <span
                      key={index}
                      onClick={() => {
                        const newValue = (newDisplay || "").split("");
                        if (char === char.toUpperCase()) {
                          newValue[index] = char.toLowerCase();
                        } else {
                          newValue[index] = char.toUpperCase();
                        }
                        setNewDisplay(newValue.join(""));
                      }}
                      style={{
                        cursor: "pointer",
                        padding: "2px 4px",
                        borderRadius: "3px",
                        backgroundColor:
                          theme.palette.mode === "dark" ? "#374151" : "#F3F4F6",
                        fontSize: "1.1rem",
                        fontWeight: 500,
                        transition: "all 0.2s ease",
                        userSelect: "none",
                        display: "inline-block",
                        minWidth: "20px",
                        textAlign: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          theme.palette.mode === "dark" ? "#4B5563" : "#E5E7EB";
                        e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          theme.palette.mode === "dark" ? "#374151" : "#F3F4F6";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>

                <TextField
                  fullWidth
                  id="display"
                  label="Display Name (Raw)"
                  placeholder="Preferred display form"
                  variant="outlined"
                  margin="normal"
                  value={newDisplay || ""}
                  onChange={(e) => setNewDisplay(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
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
              </div>
            )}

            {newBackground && (
              <div
                className="field-wrapper"
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <TextField
                    fullWidth
                    id="background"
                    label="Background"
                    placeholder="Enter color (#RRGGBBAA) or image URL"
                    variant="outlined"
                    margin="normal"
                    value={newBackground || ""}
                    onChange={(e) => setNewBackground(e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
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
                      setNewBackground("");
                    }}
                  >
                    <DeleteIcon />
                  </Button>
                </div>

                {/* Color Picker - Only show if it looks like a color */}
                {newBackground && newBackground.startsWith("#") && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                        fontSize: "0.875rem",
                      }}
                    >
                      Color Picker:
                    </Typography>
                    <input
                      type="color"
                      value={
                        newBackground.length === 9
                          ? newBackground.slice(0, 7)
                          : newBackground
                      }
                      onChange={(e) => {
                        // Convert 6-char hex to 8-char hex
                        const colorValue = e.target.value + "ff";
                        setNewBackground(colorValue);
                      }}
                      style={{
                        width: "40px",
                        height: "40px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                        fontSize: "0.75rem",
                      }}
                    >
                      Click to pick a color
                    </Typography>
                  </div>
                )}
              </div>
            )}

            {newBanner && (
              <div
                className="field-wrapper"
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <TextField
                    fullWidth
                    id="banner"
                    label="Banner"
                    placeholder="Enter color (#RRGGBBAA) or image URL"
                    variant="outlined"
                    margin="normal"
                    value={newBanner || ""}
                    onChange={(e) => setNewBanner(e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
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
                      setNewBanner("");
                    }}
                  >
                    <DeleteIcon />
                  </Button>
                </div>

                {/* Color Picker - Only show if it looks like a color */}
                {newBanner && newBanner.startsWith("#") && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          theme.palette.mode === "dark" ? "#D1D5DB" : "#6B7280",
                        fontSize: "0.875rem",
                      }}
                    >
                      Color Picker:
                    </Typography>
                    <input
                      type="color"
                      value={
                        newBanner.length === 9
                          ? newBanner.slice(0, 7)
                          : newBanner
                      }
                      onChange={(e) => {
                        // Convert 6-char hex to 8-char hex
                        const colorValue = e.target.value + "ff";
                        setNewBanner(colorValue);
                      }}
                      style={{
                        width: "40px",
                        height: "40px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
                        fontSize: "0.75rem",
                      }}
                    >
                      Click to pick a color
                    </Typography>
                  </div>
                )}
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
                const imageUrl = metadata?.image?.startsWith("ipfs://")
                  ? `https://ipfs.io/ipfs/${metadata?.image?.replace(
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
                  (field.key === "url" && newUrl) ||
                  (field.key === "bio" && newBio) ||
                  (field.key === "description" && newDescription) ||
                  (field.key === "display" && newDisplay) ||
                  (field.key === "background" && newBackground) ||
                  (field.key === "banner" && newBanner);

                // Console log for inspection
                console.log(
                  "Field:",
                  field.key,
                  "Active:",
                  isFieldActive,
                  "Value:",
                  {
                    twitter: newTwitter,
                    github: newGithub,
                    location: newLocation,
                    url: newUrl,
                    bio: newBio,
                    description: newDescription,
                    display: newDisplay,
                    background: newBackground,
                    banner: newBanner,
                  }
                );

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
        paymentTokenSymbol={paymentTokenSymbol}
      />

      <ConfirmExtendModal
        open={isConfirmExtendModalOpen}
        onClose={() => setIsConfirmExtendModalOpen(false)}
        duration={selectedDuration}
        onConfirm={handleFinalExtendConfirm}
        name={name || ""}
        parentName={parentName}
        parentAppId={parentAppId}
        paymentToken={paymentToken}
        paymentTokenDecimals={paymentTokenDecimals}
        paymentTokenSymbol={paymentTokenSymbol}
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

      <ConfirmSetDefaultModal
        open={isSetDefaultModalOpen}
        onClose={() => setIsSetDefaultModalOpen(false)}
        name={name || ""}
        onConfirm={handleSetAsDefault}
      />

      <MintModal
        open={isMintModalOpen}
        onClose={() => setIsMintModalOpen(false)}
        onConfirm={handleMint}
        mintToAddress={mintToAddress}
        setMintToAddress={setMintToAddress}
        profileName={name || ""}
        isPendingTx={isPendingTx}
      />

      <SubnameModal
        open={isSubnameModalOpen}
        onClose={handleCloseSubnameModal}
        parentName={name || ""}
        onConfirmSubname={handleConfirmSubname}
      />

      <ConfirmSubnameModal
        open={isConfirmSubnameModalOpen}
        onClose={handleCloseConfirmSubnameModal}
        parentName={name || ""}
        subname={pendingSubname}
        recipientAddress={pendingRecipientAddress}
        onConfirm={handleSubnameCreation}
      />

      <SubnameProgressModal
        open={isSubnameProgressModalOpen}
        onClose={handleCloseSubnameProgressModal}
        parentName={name || ""}
        parentAppId={parentAppId}
        subname={pendingSubname}
        recipientAddress={pendingRecipientAddress}
        onComplete={handleSubnameProgressComplete}
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
