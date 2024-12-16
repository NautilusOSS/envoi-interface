import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Fade,
  Stack,
  Snackbar,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import ClearIcon from "@mui/icons-material/Clear";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate } from "react-router-dom";
import { getNamePrice } from "../../utils/price";
import { rsvps } from "../../constants/rsvps";
import { RegistryService } from "@/services/registry";
import { debounce } from 'lodash';

type NameStatus = "Registered" | "Available" | "Grace Period" | "Reserved";

interface NameSuggestion {
  name: string;
  status: NameStatus;
  owner?: string;
  price?: number;
}

const StatusChip: React.FC<{ status: NameStatus }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "Registered":
        return { bg: "rgba(76, 175, 80, 0.1)", color: "#4CAF50" };
      case "Available":
        return { bg: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6" };
      case "Grace Period":
        return { bg: "rgba(255, 152, 0, 0.1)", color: "#FF9800" };
      case "Reserved":
        return { bg: "rgba(244, 67, 54, 0.1)", color: "#F44336" };
      default:
        return { bg: "grey.100", color: "text.secondary" };
    }
  };

  const { bg, color } = getStatusColor();

  return (
    <Chip
      label={status}
      size="small"
      sx={{
        backgroundColor: bg,
        color: color,
        fontWeight: 500,
        fontSize: "0.75rem",
      }}
    />
  );
};

const formatCompactAddress = (address: string | undefined): string => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const SearchName: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { activeAccount } = useWallet();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [openToast, setOpenToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const searchTermWithVoi = searchTerm.endsWith('.voi') 
        ? searchTerm 
        : `${searchTerm}.voi`;
      
      const checkNameAvailability = async () => {
        setIsChecking(true);
        setShowSuggestions(false);

        try {
          // First check if name is reserved
          const isReserved = searchTermWithVoi in rsvps;
          const ownerAddress = isReserved ? rsvps[searchTermWithVoi] : null;

          if (isReserved) {
            const suggestions: NameSuggestion[] = [
              {
                name: searchTermWithVoi,
                status: "Reserved",
                owner: ownerAddress
              },
              {
                name: `my${searchTerm}.voi`,
                status: "Available",
                price: getNamePrice(`my${searchTerm}`),
              },
              {
                name: `${searchTerm}123.voi`,
                status: "Available",
                price: getNamePrice(`${searchTerm}123`),
              },
            ];
            setSuggestions(suggestions);
            setShowSuggestions(true);
            return;
          }

          // If not reserved, check registration status
          const registry = new RegistryService("mainnet");
          const owner = await registry.ownerOf(searchTermWithVoi);
          const isRegistered = owner && owner !== "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

          const suggestions: NameSuggestion[] = [
            {
              name: searchTermWithVoi,
              status: isRegistered ? "Registered" : "Available",
              price: isRegistered ? undefined : getNamePrice(searchTerm),
              owner: isRegistered ? owner : undefined
            },
            {
              name: `my${searchTerm}.voi`,
              status: "Available",
              price: getNamePrice(`my${searchTerm}`),
            },
            {
              name: `${searchTerm}123.voi`,
              status: "Available",
              price: getNamePrice(`${searchTerm}123`),
            },
          ];
          setSuggestions(suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error checking name availability:', error);
          setError('Failed to check name availability');
        } finally {
          setIsChecking(false);
        }
      };

      // Debounce the availability check
      const timeoutId = setTimeout(checkNameAvailability, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const renderTitle = () => {
    if (isMobile) {
      return (
        <Box component="span">
          <span className="voi-text">Voi</span> Passport
        </Box>
      );
    }
    return (
      <Box component="span">
        Your <span className="voi-text">Voi</span> Passport
      </Box>
    );
  };

  const handleClear = () => {
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: NameSuggestion) => {
    if (suggestion.status === "Registered") {
      setToastMessage(`${suggestion.name} is already registered`);
      setOpenToast(true);
      return; // Don't close dropdown
    }

    if (suggestion.status === "Reserved") {
      setToastMessage(`${suggestion.name} is reserved`);
      setOpenToast(true);
      return; // Don't close dropdown
    }

    // Only close dropdown and navigate for available names
    if (suggestion.status === "Available") {
      setSearchTerm(suggestion.name);
      setShowSuggestions(false);
      const baseName = suggestion.name.replace(".voi", "");
      navigate(`/register/${baseName}`);
    }
  };

  const handleCloseToast = () => {
    setOpenToast(false);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Container maxWidth="md">
        <Stack
          spacing={6}
          alignItems="center"
          sx={{
            transform: "translateY(-5%)",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant={isMobile ? "h3" : "h2"}
              component="h1"
              gutterBottom
              sx={{
                "& .voi-text": {
                  color: "#8B5CF6",
                  fontWeight: 600,
                },
              }}
            >
              {renderTitle()}
            </Typography>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Decentralized naming for wallets, websites, & more.
            </Typography>
          </Box>

          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <TextField
              fullWidth
              label="Search names or addresses"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a .voi name"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  fontSize: "1.1rem",
                  "& input": {
                    padding: "20px 14px",
                    fontSize: "1.2rem",
                    height: "28px",
                  },
                  backgroundColor: "background.paper",
                },
                endAdornment: searchTerm && (
                  <IconButton
                    aria-label="clear search"
                    onClick={handleClear}
                    edge="end"
                    sx={{
                      width: "48px",
                      height: "48px",
                      mr: "4px",
                    }}
                  >
                    <ClearIcon sx={{ fontSize: "1.4rem" }} />
                  </IconButton>
                ),
              }}
              InputLabelProps={{
                sx: {
                  fontSize: "1.1rem",
                  transform: "translate(14px, 24px) scale(1)",
                  "&.Mui-focused, &.MuiInputLabel-shrink": {
                    transform: "translate(14px, -9px) scale(0.75)",
                  },
                },
              }}
            />

            <Fade in={showSuggestions && suggestions.length > 0}>
              <Paper
                sx={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  mt: 1,
                  borderRadius: 2,
                  zIndex: 1000,
                  maxHeight: "300px",
                  overflow: "auto",
                  boxShadow: theme.shadows[3],
                }}
              >
                <List>
                  {isChecking ? (
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CircularProgress size={20} />
                            <Typography>Checking availability...</Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ) : error ? (
                    <ListItem>
                      <ListItemText 
                        primary={error}
                        sx={{ color: 'error.main' }}
                      />
                    </ListItem>
                  ) : (
                    suggestions.map((suggestion, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          "&:hover": {
                            backgroundColor: "rgba(139, 92, 246, 0.08)",
                          },
                          transition: "background-color 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "rgba(139, 92, 246, 0.1)" }}>
                            <AccountCircleIcon sx={{ color: "#8B5CF6" }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={suggestion.name}
                          secondary={
                            suggestion.status === "Available"
                              ? `${suggestion.price?.toLocaleString()} VOI`
                              : suggestion.status === "Registered"
                              ? formatCompactAddress(suggestion.owner)
                              : suggestion.status === "Reserved"
                              ? formatCompactAddress(suggestion.owner)
                              : null
                          }
                          primaryTypographyProps={{
                            sx: {
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                            },
                          }}
                          secondaryTypographyProps={{
                            sx: {
                              color: theme.palette.text.secondary,
                              fontFamily: 'monospace',
                            },
                          }}
                        />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            ml: "auto",
                          }}
                        >
                          <StatusChip status={suggestion.status} />
                          <ChevronRightIcon
                            sx={{
                              color:
                                suggestion.status === "Available"
                                  ? "#8B5CF6"
                                  : "text.secondary",
                              opacity:
                                suggestion.status === "Not Supported" ? 0 : 1,
                            }}
                          />
                        </Box>
                      </ListItem>
                    ))
                  )}
                </List>
              </Paper>
            </Fade>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6" gutterBottom>
              One name for all your crypto needs
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                "& .voi-text": {
                  color: "#8B5CF6",
                  fontWeight: 600,
                },
              }}
            >
              Get your <span className="voi-text">.voi</span> name today
            </Typography>
          </Box>
        </Stack>
      </Container>

      <Snackbar
        open={openToast}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity="error"
          variant="filled"
          sx={{
            width: '100%',
            fontSize: '1.1rem',
            padding: '12px 24px',
            minWidth: 'auto',
            backgroundColor: theme.palette.error.main,
            color: '#fff',
            boxShadow: theme.shadows[3],
            borderRadius: 2,
            marginTop: '24px',
            '& .MuiAlert-message': {
              padding: '8px 0',
            },
            '& .MuiAlert-icon': {
              fontSize: '24px',
            },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SearchName;
