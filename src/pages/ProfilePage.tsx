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
  {
    key: "url",
    label: "Website",
    icon: <WebIcon />,
    placeholder: "Enter your website URL",
  },
  */
  {
    key: "location",
    label: "Location",
    icon: <LocationOnIcon />,
    placeholder: "Enter your location",
  },
];

const ProfilePage: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const { name } = useParams<{ name: string }>();
  const { theme } = useTheme();

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
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setNewTwitter(null);
    setNewGithub(null);
    setNewLocation(null);
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
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?owner=${address}&include=all`
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
    resolver.text(name || "", "com.twitter").then((twitter: string | null) => {
      setTwitter(twitter);
    });
    resolver.text(name || "", "com.github").then((github: string | null) => {
      setGithub(github);
    });
    resolver.text(name || "", "location").then((location: string | null) => {
      setLocation(location);
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
    setIsPendingTx(true);
    console.log({
      twitter,
      newTwitter,
      github,
      newGithub,
      avatarText,
      profileImage,
    });
    try {
      if (!activeAccount) return;
      const resolver = new ResolverService("mainnet", activeAccount.address);
      resolver.setMode("builder");
      console.log("Building txns...");
      const buildN = [];
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
      // Add more cases for other fields as needed
    }
    handleCloseFieldCatalog();
  };

  const filteredFields = AVAILABLE_FIELDS.filter((field) =>
    field.label.toLowerCase().includes(fieldSearchQuery.toLowerCase())
  );

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

          {twitter && (
            <div className="detail-row">
              <div className="detail-icon">
                <TwitterIcon />
              </div>
              <div className="detail-content">
                <label>Twitter</label>
                <div className="detail-value">
                  <a
                    href={`https://twitter.com/${twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="twitter-link"
                  >
                    @{twitter}
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
                  onChange={(e) => setNewTwitter(e.target.value)}
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
                  (field.key === "location" && newLocation);

                return (
                  <ListItem
                    key={field.key}
                    onClick={() => handleAddField(field)}
                    selected={isFieldActive}
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
