import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { useTheme } from "../contexts/ThemeContext";
import { useWallet } from "@txnlab/use-wallet-react";

interface SetNameModalProps {
  open: boolean;
  onClose: () => void;
  contractId: number;
}

const SetNameModal: React.FC<SetNameModalProps> = ({
  open,
  onClose,
  contractId,
}) => {
  const { mode } = useTheme();
  const { activeAccount } = useWallet();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedName(null);
    }
  }, [open]);

  const handleNameSelect = async (name: string) => {
    if (!name) return;

    try {
      setLoading(true);
      //await setNameForContract(contractId, name);
      setSelectedName(name);
      onClose();
    } catch (error) {
      console.error("Error setting name:", error);
      // You might want to add error handling/user feedback here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          Select Name
        </Typography>

        {namesLoading || loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress sx={{ color: "#8B5CF6" }} />
          </Box>
        ) : names.length === 0 ? (
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            No names available.
          </Typography>
        ) : (
          <List sx={{ mb: 2 }}>
            {names.map((name) => (
              <ListItem key={name} disablePadding>
                <ListItemButton
                  onClick={() => handleNameSelect(name)}
                  sx={{
                    borderRadius: "8px",
                    mb: 1,
                    backgroundColor:
                      selectedName === name
                        ? mode === "light"
                          ? "rgba(139, 92, 246, 0.08)"
                          : "rgba(139, 92, 246, 0.16)"
                        : "transparent",
                    "&:hover": {
                      backgroundColor:
                        mode === "light"
                          ? "rgba(139, 92, 246, 0.04)"
                          : "rgba(139, 92, 246, 0.08)",
                    },
                  }}
                >
                  <ListItemText primary={name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button
            onClick={onClose}
            sx={{
              color: mode === "light" ? "#475569" : "#94a3b8",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleNameSelect(selectedName!)}
            disabled={!selectedName || loading}
            variant="contained"
            sx={{
              backgroundColor: "#8B5CF6",
              color: "white",
              "&:hover": {
                backgroundColor: "#7C3AED",
              },
              "&.Mui-disabled": {
                backgroundColor: mode === "light" ? "#E2E8F0" : "#475569",
                color: mode === "light" ? "#94A3B8" : "#CBD5E1",
              },
            }}
          >
            Confirm
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SetNameModal;
