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
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import ClearIcon from "@mui/icons-material/Clear";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate } from "react-router-dom";
import { getNamePrice } from "../../utils/price";

type NameStatus = "Registered" | "Available" | "Grace Period" | "Not Supported";

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
      case "Not Supported":
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

const SearchName: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { activeAccount } = useWallet();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

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

  useEffect(() => {
    if (searchTerm.length > 0) {
      // Only show available names
      const mockSuggestions: NameSuggestion[] = [
        {
          name: `${searchTerm}.voi`,
          status: "Available",
          price: getNamePrice(searchTerm),
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
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const handleClear = () => {
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: NameSuggestion) => {
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);

    // Navigate based on status
    switch (suggestion.status) {
      case "Available": {
        // Remove .voi from the name before navigating
        const baseName = suggestion.name.replace(".voi", "");
        navigate(`/register/${baseName}`);
        break;
      }
      case "Registered":
        // TODO: Navigate to name details/resolver page
        console.log("Navigate to details:", suggestion.name);
        break;
      case "Grace Period":
        // TODO: Navigate to name details with grace period warning
        console.log("Navigate to grace period details:", suggestion.name);
        break;
      default:
        // Do nothing for Not Supported
        break;
    }
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
                  {suggestions.map((suggestion, index) => (
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
                            : suggestion.owner
                        }
                        primaryTypographyProps={{
                          sx: {
                            color: theme.palette.text.primary,
                            fontWeight: 500,
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
                  ))}
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
    </Box>
  );
};

export default SearchName;
