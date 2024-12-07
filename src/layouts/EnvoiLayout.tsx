import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Stack,
  Divider,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { Link, useLocation } from "react-router-dom";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { createRSVPService } from "../services/rsvp";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";

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
const USDC_APP_ID = 6779767;  // USDC asset ID on Voi

const EnvoiLayout: React.FC<EnvoiLayoutProps> = ({ children }) => {
  const { activeAccount, activeAddress, wallets } = useWallet();
  const location = useLocation();
  const theme = useTheme();
  const [displayName, setDisplayName] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [voiBalance, setVoiBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");

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
        const balance = await activeAccount.balance();
        // Convert microAlgos to VOI and format to 2 decimal places
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
        const accountInfo = await activeAccount.getAssetHolding(USDC_APP_ID);
        const balance = accountInfo?.amount || 0;
        // USDC has 6 decimals
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
                    color: "#8B5CF6", // Purple color for VOI
                    fontWeight: 600,
                  },
                }}
              >
                En<span className="voi-text">voi</span>
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
            backgroundColor: "white",
            boxShadow: "none",
            padding: "20px 0",
            borderLeft: "1px solid #E5E7EB",
            width: {
              xs: "300px",  // Default width for mobile
              sm: "400px",  // Wider on screens sm and up
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
                  sx={{ mb: 1 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "#8B5CF6",
                      width: 40,
                      height: 40,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Stack direction="column" spacing={0.5} sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        color: "#1F2937",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                      }}
                    >
                      nshell.voi
                    </Typography>
                    <Typography
                      sx={{
                        color: "#6B7280",
                        fontSize: "0.875rem",
                      }}
                    >
                      {activeAddress?.slice(0, 5)}...{activeAddress?.slice(-5)}
                    </Typography>
                  </Stack>
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
              </Stack>
              <Divider
                sx={{
                  borderColor: "#E5E7EB",
                }}
              />
              <Stack 
                direction="row" 
                justifyContent="space-between" 
                alignItems="center"
                sx={{ 
                  px: 3, 
                  py: 2,
                  borderBottom: "1px solid #E5E7EB"
                }}
              >
                <Typography
                  sx={{
                    color: "#6B7280",
                    fontSize: "0.875rem",
                  }}
                >
                  Balance
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Typography
                    sx={{
                      color: "#1F2937",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    }}
                  >
                    {voiBalance} VOI
                  </Typography>
                  <Typography
                    sx={{
                      color: "#1F2937",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    }}
                  >
                    ${usdcBalance}
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
