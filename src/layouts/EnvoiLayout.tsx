import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Stack,
  Menu,
  MenuItem,
  Modal,
  CircularProgress,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { Link, useLocation } from "react-router-dom";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { createRSVPService } from "../services/rsvp";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SettingsIcon from "@mui/icons-material/Settings";
import NetworkIcon from "@mui/icons-material/Hub";
import { NetworkSelector } from "@/components/NetworkSelector";
import { useVoiBalance } from "../hooks/useVoiBalance";
import InfoIcon from "@mui/icons-material/Info";
import ContractInfoModal from "../components/ContractInfoModal";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useTheme } from "../contexts/ThemeContext";
import PersonIcon from "@mui/icons-material/Person";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  currentPath: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, currentPath }) => {
  const theme = useTheme();
  const isActive = currentPath === to;

  return (
    <Button
      component={Link}
      to={to}
      sx={{
        color: isActive ? "#8B5CF6" : "inherit",
        textDecoration: "none",
        mx: 1,
        fontWeight: isActive ? 600 : 400,
        "&:hover": {
          color: "#A78BFA",
          backgroundColor: "transparent",
        },
        "&:after": {
          content: '""',
          position: "absolute",
          width: isActive ? "100%" : "0%",
          height: "2px",
          bottom: "0",
          left: "0",
          backgroundColor: "#8B5CF6",
          transition: "width 0.2s ease-in-out",
        },
        position: "relative",
        padding: "6px 8px",
      }}
    >
      {children}
    </Button>
  );
};

interface EnvoiLayoutProps {
  children: React.ReactNode;
}

const purpleButtonStyles = {
  backgroundColor: "#8B5CF6",
  color: "white",
  "&:hover": {
    backgroundColor: "#7C3AED",
  },
  borderRadius: "100px",
  padding: "10px 24px",
  fontSize: "1rem",
  textTransform: "none",
  height: "48px",
  minWidth: "180px",
};

const purpleOutlinedStyles = {
  color: "#8B5CF6",
  borderColor: "#8B5CF6",
  "&:hover": {
    borderColor: "#7C3AED",
    backgroundColor: "rgba(139, 92, 246, 0.04)",
  },
  borderRadius: "100px",
  padding: "10px 24px",
  fontSize: "1rem",
  textTransform: "none",
  height: "48px",
  minWidth: "180px",
};

const RSVP_CONTRACT_ID = 740413;
const EMPTY_NODE =
  "0000000000000000000000000000000000000000000000000000000000000000";
const USDC_APP_ID = 6779767; // USDC asset ID on Voi

const NETWORK_CONFIG = {
  mainnet: {
    indexerUrl: "https://mainnet-idx.voi.nodely.dev",
    algodUrl: "https://mainnet-api.voi.nodely.dev",
  },
  testnet: {
    indexerUrl: "https://testnet-idx.voi.nodely.dev",
    algodUrl: "https://testnet-api.voi.nodely.dev",
  },
} as const;

const EnvoiLayout: React.FC<EnvoiLayoutProps> = ({ children }) => {
  const { activeAccount, activeAddress, wallets } = useWallet();
  const location = useLocation();
  const [displayName, setDisplayName] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [voiBalance, setVoiBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<"mainnet" | "testnet">(
    () =>
      (localStorage.getItem("selectedNetwork") as "mainnet" | "testnet") ||
      "testnet"
  );
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const { mode, toggleTheme } = useTheme();

  const { balance, loading } = useVoiBalance(activeAddress, selectedNetwork);

  useEffect(() => {
    const fetchName = async () => {
      if (!activeAccount) {
        setDisplayName("");
        return;
      }

      try {
        const rsvpService = createRSVPService(
          RSVP_CONTRACT_ID,
          activeAccount.address
        );

        // Get account node
        const node = await rsvpService.accountNode(activeAccount.address);
        const nodeHex = Buffer.from(node).toString("hex");

        console.log({ nodeHex });

        if (nodeHex === EMPTY_NODE) {
          setDisplayName(
            `${activeAddress?.slice(0, 4)}...${activeAddress?.slice(-4)}`
          );
          return;
        }

        // Get reservation name
        const nodeNameBytes = await rsvpService.reservationName(node);
        const decoder = new TextDecoder();
        const nameWithNulls = decoder.decode(Buffer.from(nodeNameBytes));
        const name = nameWithNulls.replace(/\0/g, "");

        console.log({ name });

        if (name) {
          setDisplayName(name);
        } else {
          setDisplayName(
            `${activeAddress?.slice(0, 4)}...${activeAddress?.slice(-4)}`
          );
        }
      } catch (err) {
        console.error(err);
        setDisplayName(
          `${activeAddress?.slice(0, 4)}...${activeAddress?.slice(-4)}`
        );
      }
    };

    fetchName();
  }, [activeAccount, activeAddress]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAccount) {
        setVoiBalance("0");
        return;
      }

      try {
        const accountInfo = await activeAccount.getAccountInfo();
        const balance = accountInfo.amount || 0;
        const voiAmount = (balance / 1e6).toFixed(2);
        setVoiBalance(voiAmount);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setVoiBalance("0");
      }
    };

    fetchBalance();
  }, [activeAccount]);

  useEffect(() => {
    const fetchUSDCBalance = async () => {
      if (!activeAccount) {
        setUsdcBalance("0");
        return;
      }

      try {
        const accountInfo = await activeAccount.getAccountInfo();
        const assetHolding = accountInfo.assets?.find(
          (asset) => asset.assetId === USDC_APP_ID
        );
        const balance = assetHolding?.amount || 0;
        const usdcAmount = (balance / 1e6).toFixed(2);
        setUsdcBalance(usdcAmount);
      } catch (err) {
        console.error("Error fetching USDC balance:", err);
        setUsdcBalance("0");
      }
    };

    fetchUSDCBalance();
  }, [activeAccount]);

  const handleDrawerOpen = () => {
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
  };

  const handleConnect = (walletId: string) => {
    const selectedWallet = wallets?.find((w) => w.id === walletId);
    if (selectedWallet) {
      selectedWallet.connect();
    }
    handleDrawerClose();
  };

  const handleDisconnect = () => {
    const kibisis = wallets?.find((w) => w.id === "kibisis");
    if (kibisis) {
      kibisis.disconnect();
    }
    handleDrawerClose();
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setAnchorEl(null);
  };

  const handleNetworkChange = (network: "mainnet" | "testnet") => {
    setSelectedNetwork(network);
    localStorage.setItem("selectedNetwork", network);
    handleSettingsClose();
  };

  const handleNetworkModalOpen = () => {
    setNetworkModalOpen(true);
    handleSettingsClose();
  };

  const handleNetworkModalClose = () => {
    setNetworkModalOpen(false);
  };

  const handleInfoModalOpen = () => {
    setInfoModalOpen(true);
    handleSettingsClose();
  };

  const handleInfoModalClose = () => {
    setInfoModalOpen(false);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedNetwork") {
        const newNetwork = e.newValue as "mainnet" | "testnet";
        if (newNetwork && newNetwork !== selectedNetwork) {
          setSelectedNetwork(newNetwork);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [selectedNetwork]);

  useEffect(() => {
    const currentEndpoints = NETWORK_CONFIG[selectedNetwork];

    console.log("Current endpoints:", currentEndpoints);
  }, [selectedNetwork]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <AppBar
        sx={{ mt: 2 }}
        position="static"
        color="transparent"
        elevation={0}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="h6"
                component={Link}
                to="/"
                sx={{
                  textDecoration: "none",
                  color: "inherit",
                  mr: 4,
                  fontWeight: "bold",
                  "& .voi-text": {
                    color: "#8B5CF6",
                    fontWeight: 600,
                  },
                }}
              >
                en<span className="voi-text">voi</span>
              </Typography>

              {/* Add navlinks here */}
            </Box>

            <Box>
              {activeAccount ? (
                <Button
                  variant="outlined"
                  onClick={handleDrawerOpen}
                  endIcon={<KeyboardArrowDownIcon sx={{ color: "#8B5CF6" }} />}
                  sx={purpleOutlinedStyles}
                >
                  {displayName}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleDrawerOpen}
                  sx={purpleButtonStyles}
                >
                  Connect Wallet
                </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: {
            backgroundColor: "background.paper",
            color: "text.primary",
            boxShadow: "none",
            padding: "20px 0",
            borderLeft: `1px solid ${mode === "light" ? "#E5E7EB" : "#374151"}`,
            width: {
              xs: "300px",
              sm: "400px",
            },
          },
        }}
      >
        <Container
          sx={{
            padding: 0,
            maxWidth: "none",
          }}
        >
          {activeAccount ? (
            <>
              <Stack direction="column" sx={{ mb: 2, px: 3 }}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: mode === 'light' ? '#8B5CF6' : '#6D28D9',
                      width: 40,
                      height: 40,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Stack direction="column" spacing={0.5} sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        color: "text.primary",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                      }}
                    >
                      {displayName}
                    </Typography>
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.875rem",
                      }}
                    >
                      {activeAddress?.slice(0, 5)}...{activeAddress?.slice(-5)}
                    </Typography>
                  </Stack>
                  <IconButton
                    onClick={handleSettingsClick}
                    sx={{
                      color: "#8B5CF6",
                      "&:hover": {
                        backgroundColor: "rgba(139, 92, 246, 0.04)",
                      },
                    }}
                  >
                    <SettingsIcon />
                  </IconButton>
                  <IconButton
                    onClick={handleDisconnect}
                    sx={{
                      color: "#8B5CF6",
                      "&:hover": {
                        backgroundColor: "rgba(139, 92, 246, 0.04)",
                      },
                    }}
                  >
                    <PowerSettingsNewIcon />
                  </IconButton>
                </Stack>

                <ListItem
                  component={Link}
                  to={`/${displayName}`}
                  onClick={handleDrawerClose}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor:
                        mode === "light"
                          ? "rgba(139, 92, 246, 0.04)"
                          : "rgba(139, 92, 246, 0.08)",
                    },
                    borderRadius: "8px",
                    mb: 1,
                    mt: 2,
                    display: "flex",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  <PersonIcon
                    sx={{
                      color: "#8B5CF6",
                      mr: 2,
                      fontSize: 20,
                    }}
                  />
                  <Typography
                    sx={{
                      color: "text.primary",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    View Profile
                  </Typography>
                </ListItem>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    bgcolor: mode === "light" ? "#F9FAFB" : "#1F2937",
                    py: 1,
                    px: 2,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: mode === "light" ? "#E5E7EB" : "#374151",
                    mt: 2,
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#10B981",
                      display: "inline-block",
                    }}
                  />
                  <Typography
                    sx={{
                      color: mode === "light" ? "#1F2937" : "#F9FAFB",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      flex: 1,
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={14} sx={{ color: "#8B5CF6" }} />
                    ) : (
                      <>
                        {balance !== null
                          ? `${balance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })} VOI`
                          : "-- VOI"}
                      </>
                    )}
                  </Typography>
                  <Typography
                    sx={{
                      color: mode === "light" ? "#6B7280" : "#9CA3AF",
                      fontSize: "0.75rem",
                      bgcolor: mode === "light" ? "#E5E7EB" : "#374151",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    {selectedNetwork === "mainnet" ? "Mainnet" : "Testnet"}
                  </Typography>
                </Stack>
              </Stack>
            </>
          ) : (
            <Typography
              variant="h6"
              sx={{ mb: 2, color: "#8B5CF6", fontWeight: 600 }}
            >
              Connect Wallet
            </Typography>
          )}

          <List>
            {!activeAccount
              ? wallets?.map((wallet) => (
                  <ListItem
                    key={wallet.id}
                    onClick={() => handleConnect(wallet.id)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "rgba(139, 92, 246, 0.04)",
                      },
                      borderRadius: "8px",
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={wallet.metadata?.name || wallet.id}
                      sx={{
                        "& .MuiListItemText-primary": {
                          color: "#1F2937",
                          fontWeight: 500,
                        },
                      }}
                    />
                  </ListItem>
                ))
              : null}
          </List>
        </Container>
      </Drawer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
            "& .MuiList-root": {
              padding: 1,
            },
          },
        }}
      >
        <MenuItem
          onClick={handleNetworkModalOpen}
          sx={{
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "rgba(139, 92, 246, 0.04)",
            },
            py: 1,
          }}
        >
          <NetworkIcon
            sx={{
              mr: 2,
              color: "#8B5CF6",
              fontSize: 20,
            }}
          />
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Network
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6B7280" }}>
              {selectedNetwork === "mainnet" ? "Voi Mainnet" : "Voi Testnet"}
            </Typography>
          </Box>
        </MenuItem>

        <MenuItem
          onClick={() => {
            toggleTheme();
            handleSettingsClose();
          }}
          sx={{
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "rgba(139, 92, 246, 0.04)",
            },
            py: 1,
          }}
        >
          {mode === "light" ? (
            <DarkModeIcon
              sx={{
                mr: 2,
                color: "#8B5CF6",
                fontSize: 20,
              }}
            />
          ) : (
            <LightModeIcon
              sx={{
                mr: 2,
                color: "#8B5CF6",
                fontSize: 20,
              }}
            />
          )}
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Theme
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6B7280" }}>
              Switch to {mode === "light" ? "Dark" : "Light"} Mode
            </Typography>
          </Box>
        </MenuItem>

        <MenuItem
          onClick={handleInfoModalOpen}
          sx={{
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "rgba(139, 92, 246, 0.04)",
            },
            py: 1,
          }}
        >
          <InfoIcon
            sx={{
              mr: 2,
              color: "#8B5CF6",
              fontSize: 20,
            }}
          />
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Info
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6B7280" }}>
              About enVoi
            </Typography>
          </Box>
        </MenuItem>
      </Menu>

      <Modal
        open={networkModalOpen}
        onClose={handleNetworkModalClose}
        closeAfterTransition
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            border: "2px solid #000",
            boxShadow: 24,
            p: 4,
          }}
        >
          <NetworkSelector
            open={networkModalOpen}
            onClose={handleNetworkModalClose}
            selectedNetwork={selectedNetwork}
            onNetworkChange={handleNetworkChange}
          />
        </Box>
      </Modal>

      <ContractInfoModal
        open={infoModalOpen}
        onClose={handleInfoModalClose}
        selectedNetwork={selectedNetwork}
      />

      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default EnvoiLayout;
