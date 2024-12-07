import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import "./ProfilePage.scss";
import { RegistryService } from "@/services/registry";
import { useWallet } from "@txnlab/use-wallet-react";
import { Snackbar, Alert, Avatar } from "@mui/material";
import { useTheme } from '@/contexts/ThemeContext';

type NetworkType = "mainnet" | "testnet";

const ProfilePage: React.FC = () => {
  const { activeAccount } = useWallet();
  const { name } = useParams<{ name: string }>();
  const { theme } = useTheme();

  // Replace the hardcoded network with localStorage
  const selectedNetwork: NetworkType =
    (localStorage.getItem("selectedNetwork") as NetworkType) || "testnet";
  const explorerBaseUrl =
    selectedNetwork === "mainnet"
      ? "https://block.voi.network/explorer"
      : "https://testnet.block.voi.network/explorer";

  const [openNotification, setOpenNotification] = React.useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setOpenNotification(true);
  };

  const handleCloseNotification = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenNotification(false);
  };

  const [owner, setOwner] = React.useState<string | null>(null);
  useEffect(() => {
    if (!activeAccount) return;
    const registry = new RegistryService(
      "testnet",
      30000,
      activeAccount.address
    );
    registry.ownerOf(name || "").then((owner) => {
      setOwner(owner);
    });
  }, [name]);

  return (
    <div className="profile-container">
      <div className="profile-banner">
        <div className="banner-content">
          <Avatar 
            sx={{ width: 120, height: 120, bgcolor: '#3B82F6' }}
            className="profile-avatar"
          >
            {name?.charAt(0).toUpperCase()}
          </Avatar>
          <h1 className="profile-name">{name}.voi</h1>
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
              <CalendarTodayIcon />
            </div>
            <div className="detail-content">
              <label>Registration Date</label>
              <div className="detail-value">Loading...</div>
            </div>
          </div>
        </div>
      </div>

      <Snackbar 
        open={openNotification} 
        autoHideDuration={2000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity="success" sx={{ width: '100%' }}>
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ProfilePage;
