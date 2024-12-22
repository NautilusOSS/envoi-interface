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
  TextField,
  Dialog,
  DialogContent,
  Alert,
  Select,
  SelectChangeEvent,
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
import EditIcon from "@mui/icons-material/Edit";
import { CONTRACT, abi } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { APP_SPEC as ReverseRegistrarSpec } from "@/clients/ReverseRegistrarClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { APP_SPEC as RegistrySpec } from "@/clients/VNSRegistryClient";
import algosdk from "algosdk";
import {
  namehash,
  stringToUint8Array,
  uint8ArrayToBigInt,
} from "@/utils/namehash";
import { useName } from "@/hooks/useName";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ReservationsModal from "@/components/ReservationsModal";
import { rsvps } from "@/constants/rsvps";
import DomainIcon from "@mui/icons-material/Domain";
import MyNamesModal from "@/components/MyNamesModal";
import PaymentIcon from "@mui/icons-material/Payment";

export const DEFAULT_PAYMENT_METHOD = "VOI";

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

interface TransactionPendingModalProps {
  open: boolean;
}

const TransactionPendingModal: React.FC<TransactionPendingModalProps> = ({
  open,
}) => {
  return (
    <Dialog
      open={open}
      PaperProps={{ sx: { backgroundColor: "background.paper" } }}
    >
      <DialogContent sx={{ textAlign: "center", py: 4 }}>
        <CircularProgress sx={{ color: "#8B5CF6", mb: 2 }} />
        <Typography variant="h6" sx={{ color: "text.primary" }}>
          Waiting for transaction signature...
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

const EnvoiLayout: React.FC<EnvoiLayoutProps> = ({ children }) => {
  const { signTransactions, activeAccount, activeAddress, wallets } =
    useWallet();
  const { displayName, isLoading } = useName(activeAccount?.address);
  const location = useLocation();
  //const [displayName, setDisplayName] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [voiBalance, setVoiBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<"mainnet" | "testnet">(
    () =>
      (localStorage.getItem("selectedNetwork") as "mainnet" | "testnet") ||
      "mainnet"
  );
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const { mode, toggleTheme } = useTheme();
  const [setNameModalOpen, setSetNameModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [hasReservations, setHasReservations] = React.useState(false);
  const [myNamesModalOpen, setMyNamesModalOpen] = useState(false);
  const [namesModalMode, setNamesModalMode] = useState<"view" | "setPrimary">(
    "view"
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAssetSymbol, setPaymentAssetSymbol] = useState<string>(
    () =>
      localStorage.getItem("preferredPaymentMethod") || DEFAULT_PAYMENT_METHOD
  );

  const { balance, loading } = useVoiBalance(activeAddress, selectedNetwork);

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

  useEffect(() => {
    if (!activeAccount) {
      setHasReservations(false);
      return;
    }

    const userReservations = Object.values(rsvps).some(
      (address) => address === activeAccount.address
    );
    setHasReservations(userReservations);
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

  const handleSetName = async (name: string) => {
    try {
      setIsPending(true);
      if (!activeAccount) {
        return;
      }

      const vns = {
        register: 797607,
        resolver: 797608,
        registrar: 797609,
        reverseRegistrar: 797610,
      };

      const wVOI = {
        tokenId: 828295, // en Voi
      };

      // const aUSDC = {
      //   asaAssetId: 302190,
      //   tokenId: 395614,
      // };

      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        vns.reverseRegistrar,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      const ciRegistry = new CONTRACT(
        vns.register,
        algodClient,
        indexerClient,
        {
          name: "registry",
          description: "Registry",
          methods: RegistrySpec.contract.methods,
          events: [],
        },
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
          vns.reverseRegistrar,
          algodClient,
          indexerClient,
          {
            name: "reverse-registrar",
            description: "Reverse Registrar",
            methods: ReverseRegistrarSpec.contract.methods,
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
        resolver: new CONTRACT(
          vns.resolver,
          algodClient,
          indexerClient,
          {
            name: "vns-public-resolver",
            description: "VNS Public Resolver",
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
      const label = `${activeAccount.address}.addr.reverse`;
      const node = await namehash(label);
      const ownerOfR = await ciRegistry.ownerOf(node);
      if (!ownerOfR.success) {
        throw new Error("Failed to get owner of node");
      }
      const ownerOf = ownerOfR.returnValue;
      const doRegister = ownerOf !== activeAccount.address;

      const buildN = [];
      let customR;
      for (const p0 of [0, 28500]) {
        if (doRegister) {
          // Deposit USDC (ASA -> ARC200)
          // {
          //   const txnO = (await builder.arc200.deposit(1e6))?.obj;
          //   const assetTransfer = {
          //     xaid: aUSDC.asaAssetId,
          //     aamt: 1e6,
          //     payment: 28500,
          //   };
          //   buildN.push({
          //     ...txnO,
          //     ...assetTransfer,
          //   });
          // }
          // Create wVOI Balance for user
          if (p0 > 0) {
            const txnO = (
              await builder.arc200.createBalanceBox(activeAccount.address)
            )?.obj;
            buildN.push({
              ...txnO,
              payment: p0,
              note: new TextEncoder().encode(
                `envoi createBalanceBox 1000 ${paymentAssetSymbol} for reverse-registrar payment`
              ),
            });
          }
          // deposit wVOI (NET -> ARC200)
          {
            const txnO = (await builder.arc200.deposit(1000 * 1e6))?.obj;
            buildN.push({
              ...txnO,
              payment: 1000 * 1e6,
              note: new TextEncoder().encode(
                `envoi deposit 1000 ${paymentAssetSymbol} for reverse-registrar payment`
              ),
            });
          }
          // approve spending for register
          {
            const txnO = (
              await builder.arc200.arc200_approve(
                algosdk.getApplicationAddress(vns.reverseRegistrar),
                1000 * 1e6
              )
            )?.obj;
            buildN.push({
              ...txnO,
              payment: 28501,
              note: new TextEncoder().encode(
                `arc200 approve ${algosdk.getApplicationAddress(
                  vns.reverseRegistrar
                )} ${1000}`
              ),
            });
          }
          // register with reverse registrar
          {
            const txnO = (
              await builder.registrar.register(
                algosdk.decodeAddress(activeAccount.address).publicKey,
                activeAccount.address,
                0
              )
            )?.obj;
            buildN.push({
              ...txnO,
              payment: 336700,
              note: new TextEncoder().encode(
                `reverse-registrar register ${activeAddress}.addr.reverse`
              ),
            });
          }
        }
        // set name with resolver
        {
          const txnO = (
            await builder.resolver.setName(
              await namehash(`${activeAddress}.addr.reverse`),
              stringToUint8Array(name)
            )
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 336700,
            note: new TextEncoder().encode(
              `resolver setName ${activeAddress}.addr.reverse ${name}`
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
      console.log({ customR });
      if (!customR.success) {
        throw new Error("Failed to register name");
      }
      const stxns = await signTransactions(
        customR.txns.map((t: string) => {
          return new Uint8Array(Buffer.from(t, "base64"));
        })
      );
      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      console.log({ res });
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  const handleEditClick = () => {
    setNamesModalMode("setPrimary");
    setMyNamesModalOpen(true);
  };

  const handleMyNamesClick = () => {
    setNamesModalMode("view");
    setMyNamesModalOpen(true);
    handleDrawerClose(); // Close the drawer when opening modal
  };

  const refreshName = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePaymentModalOpen = () => {
    setPaymentModalOpen(true);
    handleSettingsClose();
  };

  const handlePaymentModalClose = () => {
    setPaymentModalOpen(false);
  };

  const handlePaymentMethodChange = (event: SelectChangeEvent<string>) => {
    const newMethod = event.target.value;
    setPaymentAssetSymbol(newMethod);
    localStorage.setItem("preferredPaymentMethod", newMethod);
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
                  {isLoading ? (
                    <CircularProgress size={14} sx={{ color: "#8B5CF6" }} />
                  ) : (
                    displayName
                  )}
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
                      bgcolor: mode === "light" ? "#8B5CF6" : "#6D28D9",
                      width: 40,
                      height: 40,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Stack direction="column" spacing={0.5} sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{
                          color: "text.primary",
                          fontWeight: 600,
                          fontSize: "1.1rem",
                        }}
                      >
                        {displayName}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={handleEditClick}
                        sx={{
                          color: "#8B5CF6",
                          "&:hover": {
                            backgroundColor: "rgba(139, 92, 246, 0.04)",
                          },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
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

                <ListItem
                  onClick={handleMyNamesClick}
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
                    display: "flex",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  <DomainIcon
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
                    My Names
                  </Typography>
                </ListItem>

                {hasReservations && (
                  <ListItem
                    onClick={() => {
                      setReservationsModalOpen(true);
                      handleDrawerClose();
                    }}
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
                      display: "flex",
                      alignItems: "center",
                      textDecoration: "none",
                    }}
                  >
                    <FormatListBulletedIcon
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
                      Reservations
                    </Typography>
                  </ListItem>
                )}

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
          onClick={handlePaymentModalOpen}
          sx={{
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "rgba(139, 92, 246, 0.04)",
            },
            py: 1,
          }}
        >
          <PaymentIcon
            sx={{
              mr: 2,
              color: "#8B5CF6",
              fontSize: 20,
            }}
          />
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Payment
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6B7280" }}>
              Manage payment settings
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

      {/*
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
      */}

      <ContractInfoModal
        open={infoModalOpen}
        onClose={handleInfoModalClose}
        selectedNetwork={selectedNetwork}
      />

      <TransactionPendingModal open={isPending} />

      <ReservationsModal
        open={reservationsModalOpen}
        onClose={() => setReservationsModalOpen(false)}
      />

      <MyNamesModal
        open={myNamesModalOpen}
        onClose={() => setMyNamesModalOpen(false)}
        mode={namesModalMode}
        setName={handleSetName}
        onNameSet={refreshName}
      />

      <Dialog
        open={paymentModalOpen}
        onClose={handlePaymentModalClose}
        PaperProps={{
          sx: {
            backgroundColor: "background.paper",
            maxWidth: "400px",
            width: "100%",
            borderRadius: "12px",
          },
        }}
      >
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Set Payment Method
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            Choose your preferred payment method for transactions.
          </Typography>
          <Select
            fullWidth
            value={paymentAssetSymbol}
            onChange={handlePaymentMethodChange}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: mode === "light" ? "#E5E7EB" : "#374151",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#8B5CF6",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#8B5CF6",
              },
            }}
          >
            <MenuItem value="VOI">VOI</MenuItem>
            {/*<MenuItem value="aUSDC">aUSDC</MenuItem>*/}
            <MenuItem value="UNIT">UNIT</MenuItem>
          </Select>
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}
          >
            <Button
              onClick={handlePaymentModalClose}
              sx={{
                color: "text.primary",
                "&:hover": {
                  backgroundColor:
                    mode === "light"
                      ? "rgba(0, 0, 0, 0.04)"
                      : "rgba(255, 255, 255, 0.08)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#8B5CF6",
                color: "white",
                "&:hover": {
                  backgroundColor: "#7C3AED",
                },
              }}
              onClick={handlePaymentModalClose}
            >
              Save
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

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
