import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TimerIcon from "@mui/icons-material/Timer";
import "./ProfilePage.scss";
import { RegistryService } from "@/services/registry";
import { useWallet } from "@txnlab/use-wallet-react";
import { Snackbar, Alert, Avatar } from "@mui/material";
import { useTheme } from "@/contexts/ThemeContext";
import { RegistrarService } from "@/services/registrar";
import { namehash, uint8ArrayToBigInt } from "@/utils/namehash";
import { ResolverService } from "@/services/resolver";

type NetworkType = "mainnet" | "testnet";

const ProfilePage: React.FC = () => {
  const { activeAccount } = useWallet();
  const { name } = useParams<{ name: string }>();
  const { theme } = useTheme();

  const selectedNetwork: NetworkType =
    (localStorage.getItem("selectedNetwork") as NetworkType) || "testnet";
  const explorerBaseUrl =
    selectedNetwork === "mainnet"
      ? "https://block.voi.network/explorer"
      : "https://testnet.block.voi.network/explorer";

  const [openNotification, setOpenNotification] = React.useState(false);
  const [owner, setOwner] = React.useState<string | null>(null);
  const [expiry, setExpiry] = React.useState<Date | null>(null);
  const [avatarText, setAvatarText] = React.useState<string | null>(null);

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

  useEffect(() => {
    if (!activeAccount) return;
    const registry = new RegistryService("mainnet");
    const registrar = new RegistrarService("mainnet");
    const resolver = new ResolverService("mainnet");
    registry.ownerOf(name || "").then((owner) => {
      setOwner(owner);
    });
    namehash(name || "").then((nameHash) => {
      const tokenId = uint8ArrayToBigInt(nameHash);
      registrar.expiration(tokenId).then((expiryTimestamp) => {
        const expiryTimestampNumber = Number(expiryTimestamp);
        if (expiryTimestampNumber) {
          setExpiry(new Date(expiryTimestampNumber * 1000));
        }
      });
    });
    resolver.text(name || "", "avatar").then((avatar: string | null) => {
      setAvatarText(avatar);
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

  return (
    <div className="profile-container">
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
        </div>
      </div>

      <div className="profile-details">
        <div className="details-card">
          <div className="card-header">
            <h2>Profile Details</h2>
          </div>

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

          <div className="detail-row">
            <div className="detail-icon">
              <TimerIcon />
            </div>
            <div className="detail-content">
              <label>Expiry</label>
              <div className="detail-value">{formatExpiry(expiry)}</div>
            </div>
          </div>
        </div>
      </div>

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
