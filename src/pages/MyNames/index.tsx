import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { createRSVPService } from "../../services/rsvp";
import { getAlgorandClients } from "@/wallets";

interface Reservation {
  name: string;
  price: number;
  timestamp: number;
}

const RSVP_CONTRACT_ID = 740413;
const EMPTY_NODE =
  "0000000000000000000000000000000000000000000000000000000000000000";

const MyNames: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservations = async () => {
      if (!activeAccount) return;

      setIsLoading(true);
      setError(null);

      try {
        const rsvpService = createRSVPService(
          RSVP_CONTRACT_ID,
          activeAccount.address
        );

        // Get account node
        const node = await rsvpService.accountNode(activeAccount.address);
        const nodeHex = Buffer.from(node).toString("hex");

        if (nodeHex === EMPTY_NODE) {
          setReservations([]);
          return;
        }

        // Get reservation name
        const nodeNameBytes = await rsvpService.reservationName(node);

        console.log({ nodeNameBytes });

        // Convert Uint8Array to string and remove null bytes
        const decoder = new TextDecoder();
        const nameWithNulls = decoder.decode(Buffer.from(nodeNameBytes));
        const name = nameWithNulls.replace(/\0/g, "");

        // Get reservation price
        const price = await rsvpService.reservationPrice(node);

        console.log("Reserved name:", name);

        if (name) {
          setReservations([
            {
              name,
              price: Number(price) / 1e6,

              timestamp: Date.now(),
            },
          ]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch reservations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, [activeAccount]);

  const handleRelease = async (name: string) => {
    if (!activeAccount) return;

    try {
      const rsvpService = createRSVPService(
        RSVP_CONTRACT_ID,
        activeAccount.address
      );
      // Release reservation
      const success = await rsvpService.release(name);
      const stxns = await signTransactions(
        success.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const { algodClient } = getAlgorandClients();
      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      console.log({ res });
      if (success) {
        // Remove from list
        setReservations((prev) => prev.filter((r) => r.name !== name));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to release reservation");
    }
  };

  if (!activeAccount) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 8, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Connect your wallet to view your names
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          My Names
        </Typography>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom>
            My Reservations
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Paper
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            {isLoading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : reservations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  You don't have any reservations yet
                </Typography>
              </Box>
            ) : (
              <List>
                {reservations.map((reservation, index) => (
                  <React.Fragment key={reservation.name}>
                    <ListItem
                      sx={{
                        py: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "rgba(139, 92, 246, 0.1)" }}>
                            <AccountCircleIcon sx={{ color: "#8B5CF6" }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={reservation.name}
                          secondary={`${reservation.price.toLocaleString()} VOI`}
                          primaryTypographyProps={{
                            sx: { fontWeight: 500 },
                          }}
                        />
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRelease(reservation.name)}
                      >
                        Release
                      </Button>
                    </ListItem>
                    {index < reservations.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default MyNames;
