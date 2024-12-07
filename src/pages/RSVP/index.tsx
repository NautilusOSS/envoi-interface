import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  Link,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { useNavigate, useParams } from "react-router-dom";
import { PricingInfo } from "../../components/PricingModal";
import TermsModal from "../../components/TermsModal";
import { createRSVPService } from "../../services/rsvp";
import { getNamePrice } from "../../utils/price";
import { getAlgorandClients } from "@/wallets";

const RSVP_CONTRACT_ID = 740413;

const RSVP: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const { activeAccount, signTransactions } = useWallet();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    if (name) {
      try {
        const namePrice = getNamePrice(name);
        setPrice(namePrice);
      } catch (err) {
        setError("Failed to calculate price");
        console.error(err);
      }
    }
  }, [name]);

  const handleReserve = async () => {
    if (!activeAccount || !name || !price) return;

    console.log(name, price);

    setIsLoading(true);
    setError(null);

    try {
      const rsvpService = createRSVPService(
        RSVP_CONTRACT_ID,
        activeAccount.address
      );

      // Calculate price
      const namePrice = await rsvpService.price(name.length);

      // Reserve name
      const result = await rsvpService.reserve("voi", name);

      if (!result.success) {
        setError("Failed to reserve name");
        return;
      }

      // Sign transaction
      const stxns = await signTransactions(
        result.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const { algodClient } = getAlgorandClients();

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      console.log({ res });

      navigate("/my-names");
    } catch (err) {
      setError("Failed to reserve name");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography
          variant={isMobile ? "h3" : "h2"}
          component="h1"
          gutterBottom
          align="center"
          sx={{
            "& .voi-text": {
              color: "#8B5CF6",
              fontWeight: 600,
            },
          }}
        >
          Reserve Name
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={4}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Name
            </Typography>
            <Typography variant="h5">
              {name}
              <span className="voi-text">.voi</span>
            </Typography>
          </Box>

          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="subtitle1" color="text.secondary">
                Price
              </Typography>
              <Box sx={{ transform: "translateY(-1px)" }}>
                <PricingInfo />
              </Box>
            </Box>
            <Typography variant="h5">
              {price ? `${price.toLocaleString()} VOI` : "-"}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Owner
            </Typography>
            <Typography variant="h6">
              {activeAccount?.address
                ? `${activeAccount.address.slice(
                    0,
                    8
                  )}...${activeAccount.address.slice(-4)}`
                : "Connect wallet to reserve"}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleReserve}
            disabled={!activeAccount || isLoading}
            sx={{
              height: "48px",
              borderRadius: "100px",
              backgroundColor: "#8B5CF6",
              "&:hover": {
                backgroundColor: "#7C3AED",
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Reserve Name"
            )}
          </Button>
        </Stack>
      </Paper>

      <Box
        sx={{
          mt: 4,
          p: 2,
          bgcolor: "rgba(139, 92, 246, 0.05)",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "rgba(139, 92, 246, 0.1)",
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          By reserving a name, you acknowledge and agree to our{" "}
          <Link
            component="button"
            variant="body2"
            onClick={() => setTermsOpen(true)}
            sx={{
              color: "#8B5CF6",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Terms of Service
          </Link>
        </Typography>
      </Box>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </Container>
  );
};

export default RSVP;
