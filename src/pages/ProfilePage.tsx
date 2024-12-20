import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TimerIcon from "@mui/icons-material/Timer";
import "./ProfilePage.scss";
import { RegistryService } from "@/services/registry";
import { useWallet } from "@txnlab/use-wallet-react";
import { Snackbar, Alert, Avatar, Modal, Box, Button } from "@mui/material";
import { useTheme } from "@/contexts/ThemeContext";
import { RegistrarService } from "@/services/registrar";
import { namehash, uint8ArrayToBigInt } from "@/utils/namehash";
import { ResolverService } from "@/services/resolver";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { CONTRACT, abi } from "ulujs";

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
  // ... other props ...
}

const SelectNFTModal: React.FC<SelectNFTModalProps> = ({
  onClose,
  ...props
}) => {
  // ... modal code ...

  <Button
    onClick={() => {
      onClose();
      setSelectedNftId(null);
    }}
    variant="outlined"
  >
    Cancel
  </Button>;
};

const ProfilePage: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
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
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = React.useState(false);
  const [isNftModalOpen, setIsNftModalOpen] = React.useState(false);
  const [nfts, setNfts] = React.useState<NFTToken[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedNftId, setSelectedNftId] = useState<string | null>(null);
  const [showNftModal, setShowNftModal] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

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

  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);

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

  const fetchNFTs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?owner=G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ&include=all"
      );
      const data = await response.json();
      setNfts(data.tokens);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNFTs();
  }, [isNftModalOpen]);

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

  const filteredNfts = nfts.filter((nft) => {
    try {
      const metadata: NFTMetadata = JSON.parse(nft.metadata);
      return (
        metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.collectionName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } catch (e) {
      return false;
    }
  });

  const handleNftSelect = (nft) => {
    setSelectedNftId(`nft-${nft.contractId}-${nft.tokenId}`);
    const metadata: NFTMetadata = JSON.parse(nft.metadata);
    setProfileImage(metadata.image);
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
          setProfileImage(metadata.image);
          setSelectedNftId(null); // Reset selection
        } catch (e) {
          console.error("Error parsing NFT metadata:", e);
        }
      }
    }
    setShowNftModal(false);
  };

  const handleSave = async () => {
    console.log("name", name);
    console.log("profileImage", profileImage);
    console.log("avatarText", avatarText);
    try {
      if (!activeAccount) return;
      const resolver = new ResolverService("mainnet", activeAccount.address);
      resolver.setMode("builder");
      const buildN = [];
      if (profileImage !== avatarText) {
        if (!name || !profileImage) return;
        const setTextR: any = await resolver.setText(
          name,
          "avatar",
          profileImage
        );
        buildN.push(setTextR);
      }

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

      if (!customR.success) {
        throw new Error("Failed to set profile");
      }

      console.log(customR);

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      const res = await resolver
        .getClient()
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      console.log(res);

      setIsEditModalOpen(false);
    } catch (e) {
      console.error("Error saving profile:", e);
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

          <div className="detail-divider">
            {activeAccount?.address === owner && (
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
                    <img src={metadata.image} alt={metadata.name} />
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
                setShowNftModal(false);
                setSelectedNftId(null);
              }}
              variant="outlined"
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>

      {/*showNftModal && (
        <SelectNFTModal
          nfts={nfts}
          isLoading={loading}
          onClose={() => setShowNftModal(false)}
          selectedNftId={selectedNftId}
          setSelectedNftId={setSelectedNftId}
          onSelect={handleNftSelect}
          isOpen={showNftModal}
        />
      )*/}

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
