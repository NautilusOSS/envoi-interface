import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { useSnackbar } from "notistack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useParams } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

// Add payment method constants
const PAYMENT_RATES = {
  VOI: 2000, // 1000 VOI per year
  aUSDC: 5, // 10 USDC per year
  UNIT: 40, // 1000 UNIT per year
} as const;

const RegisterName: React.FC = () => {
  const { name: initialName } = useParams<{ name: string }>();
  const [name, setName] = useState(initialName || "");
  const [duration, setDuration] = useState("1");
  const [loading, setLoading] = useState(false);
  const { activeAccount } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const { mode } = useTheme();
  const [paymentMethod] = useState(
    () => localStorage.getItem("preferredPaymentMethod") || "VOI"
  );

  const getPaymentAmount = () => {
    const rate = PAYMENT_RATES[paymentMethod as keyof typeof PAYMENT_RATES];
    return rate * parseInt(duration);
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      // TODO: Implement name registration logic using VNS contract
      console.log("Registering:", name, "for", duration, "years");

      enqueueSnackbar("Name registered successfully!", { variant: "success" });
    } catch (error) {
      console.error("Error registering name:", error);
      enqueueSnackbar("Failed to register name. Please try again.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Register VOI Name
        </Typography>

        {!activeAccount && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please connect your wallet to register a name
          </Alert>
        )}

        <Paper
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            maxWidth: "sm",
            mx: "auto",
          }}
        >
          <TextField
            label="Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name to register"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">.voi</InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              label="Duration (years)"
              type="number"
              variant="outlined"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              inputProps={{ min: "1", max: "10" }}
              fullWidth
            />
            <Tooltip title="Registration fee is 1000 VOI per year" arrow>
              <IconButton size="small">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box
            sx={{
              p: 2,
              bgcolor: mode === "light" ? "#F9FAFB" : "#1F2937",
              borderRadius: 1,
              border: "1px solid",
              borderColor: mode === "light" ? "#E5E7EB" : "#374151",
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Registration Cost
            </Typography>
            <Typography variant="h6" color="text.primary">
              {getPaymentAmount()} {paymentMethod}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {PAYMENT_RATES[paymentMethod as keyof typeof PAYMENT_RATES]}{" "}
              {paymentMethod} per year
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleRegister}
            disabled={!activeAccount || loading}
            fullWidth
            sx={{
              bgcolor: "#8B5CF6",
              "&:hover": {
                bgcolor: "#7C3AED",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Register for ${getPaymentAmount()} ${paymentMethod}`
            )}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterName;
