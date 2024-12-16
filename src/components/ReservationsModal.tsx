import React from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  CircularProgress,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useWallet } from "@txnlab/use-wallet-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";
import { rsvps } from "@/constants/rsvps";
import { RegistryService } from "@/services/registry";

interface ReservationsModalProps {
  open: boolean;
  onClose: () => void;
}

interface NameStatus {
  name: string;
  isOwned: boolean;
}

const ReservationsModal: React.FC<ReservationsModalProps> = ({
  open,
  onClose,
}) => {
  const { activeAccount } = useWallet();
  const { mode } = useTheme();
  const [reservations, setReservations] = React.useState<NameStatus[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchReservations = async () => {
      if (!activeAccount) return;

      try {
        setLoading(true);
        const registry = new RegistryService("mainnet");

        // Get all names for this address
        const userReservationNames = Object.entries(rsvps)
          .filter(([_, address]) => address === activeAccount.address)
          .map(([name]) => name);

        // Check ownership for each name
        const nameStatuses = await Promise.all(
          userReservationNames.map(async (name) => {
            const owner = await registry.ownerOf(name);
            console.log({ owner });
            return {
              name,
              isOwned: owner === activeAccount.address,
            };
          })
        );

        setReservations(nameStatuses);
      } catch (error) {
        console.error("Error fetching reservations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [activeAccount]);

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="reservations-modal">
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 500 },
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "text.secondary",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h6"
          component="h2"
          sx={{ mb: 3, color: "#8B5CF6" }}
        >
          Your Reservations
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#8B5CF6" }} />
          </Box>
        ) : reservations.length > 0 ? (
          <List sx={{ mb: 2 }}>
            {reservations.map(({ name, isOwned }) => (
              <ListItem
                key={name}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 2,
                  borderBottom: 1,
                  borderColor: mode === "light" ? "#E5E7EB" : "#374151",
                  "&:last-child": {
                    borderBottom: "none",
                  },
                }}
              >
                <Typography sx={{ color: "text.primary" }}>{name}</Typography>
                {isOwned ? (
                  <Button
                    component={Link}
                    to={`/${name}`}
                    onClick={onClose}
                    variant="outlined"
                    size="small"
                    sx={{
                      width: 100,
                      color: "#8B5CF6",
                      borderColor: "#8B5CF6",
                      "&:hover": {
                        borderColor: "#7C3AED",
                        backgroundColor: "rgba(139, 92, 246, 0.04)",
                      },
                    }}
                  >
                    View
                  </Button>
                ) : (
                  <Button
                    component={Link}
                    to={`/register/${name}`}
                    onClick={onClose}
                    variant="contained"
                    size="small"
                    sx={{
                      width: 100,
                      backgroundColor: "#8B5CF6",
                      color: "#FFFFFF",
                      "&:hover": {
                        backgroundColor: "#7C3AED",
                      },
                    }}
                  >
                    Register
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography
            sx={{
              textAlign: "center",
              color: "text.secondary",
              py: 4,
            }}
          >
            You don't have any reservations yet.
          </Typography>
        )}
      </Box>
    </Modal>
  );
};

export default ReservationsModal;
