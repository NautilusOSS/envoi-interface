import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  CircularProgress,
  Button,
  TextField,
  Pagination,
  Stack,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useWallet } from "@txnlab/use-wallet-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";
import { useName } from "@/hooks/useName";
import { CONTRACT, abi } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { APP_SPEC as VNSResolverSpec } from "@/clients/VNSPublicResolverClient";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { useSnackbar } from "notistack";

interface MyNamesModalProps {
  open: boolean;
  onClose: () => void;
  mode: "view" | "setPrimary";
  setName?: (name: string) => Promise<void>;
  onNameSet?: () => void;
}

interface NFTToken {
  contractId: number;
  tokenId: string;
  owner: string;
  metadata: string;
  collectionName: string;
}

interface NFTResponse {
  currentRound: number;
  tokens: NFTToken[];
}

const ITEMS_PER_PAGE = 5;

const MyNamesModal: React.FC<MyNamesModalProps> = ({
  open,
  onClose,
  mode: modalMode,
  setName,
  onNameSet,
}) => {
  const { activeAccount, signTransactions } = useWallet();
  const { mode: themeMode } = useTheme();
  const [names, setNames] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { displayName, refetch } = useName(activeAccount?.address);
  const [setNameModalOpen, setSetNameModalOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleSetNameClick = (name: string) => {
    setSelectedName(name);
    setSetNameModalOpen(true);
  };

  const handleSetNameConfirm = async () => {
    if (!activeAccount || !setName) return;

    try {
      setLoading(true);
      await setName(selectedName);

      await refetch();

      enqueueSnackbar("Name set successfully!", {
        variant: "success",
      });

      onNameSet?.();

      setSetNameModalOpen(false);
      onClose();
    } catch (error) {
      console.error("Error setting name:", error);
      enqueueSnackbar("Failed to set name. Please try again.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const fetchNames = async () => {
      if (!activeAccount) return;

      try {
        setLoading(true);
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=797609&owner=${activeAccount.address}`
        );
        const data: NFTResponse = await response.json();

        const namesList = data.tokens
          .map((token) => {
            try {
              const metadata = JSON.parse(token.metadata);
              return metadata.name;
            } catch (e) {
              console.error("Error parsing metadata:", e);
              return null;
            }
          })
          .filter(
            (name): name is string => name !== null && name.trim() !== ""
          );

        setNames(namesList);
      } catch (error) {
        console.error("Error fetching names:", error);
        setNames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNames();
  }, [activeAccount]);

  // Filter names based on search term
  const filteredNames = names.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredNames.length / ITEMS_PER_PAGE);
  const paginatedNames = filteredNames.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  console.log("Total names:", names.length);
  console.log("Filtered names:", filteredNames.length);
  console.log("Paginated names:", paginatedNames.length);

  return (
    <>
      <Modal open={open} onClose={onClose} aria-labelledby="my-names-modal">
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
            {modalMode === "setPrimary" ? "Set Primary Name" : "My Names"}
          </Typography>

          {!loading && names.length > 0 && (
            <TextField
              fullWidth
              size="small"
              placeholder="Search names..."
              value={searchTerm}
              onChange={handleSearch}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#8B5CF6" }} />
            </Box>
          ) : paginatedNames.length > 0 ? (
            <Stack spacing={2}>
              <List sx={{ mb: 2 }}>
                {paginatedNames.map((name, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 2,
                      borderBottom: 1,
                      borderColor:
                        themeMode === "light" ? "#E5E7EB" : "#374151",
                      "&:last-child": {
                        borderBottom: "none",
                      },
                    }}
                  >
                    <Typography sx={{ color: "text.primary" }}>
                      {name}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {modalMode === "setPrimary" && (
                        <>
                          {name === displayName ? (
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{
                                color: "#10B981",
                                borderColor: "#10B981",
                                "&:hover": {
                                  borderColor: "#059669",
                                  backgroundColor: "rgba(16, 185, 129, 0.04)",
                                },
                                minWidth: "100px",
                              }}
                              disabled
                            >
                              Primary
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleSetNameClick(name)}
                              sx={{
                                color: "#8B5CF6",
                                borderColor: "#8B5CF6",
                                "&:hover": {
                                  borderColor: "#7C3AED",
                                  backgroundColor: "rgba(139, 92, 246, 0.04)",
                                },
                                minWidth: "100px",
                              }}
                            >
                              Set Name
                            </Button>
                          )}
                        </>
                      )}
                      {modalMode === "view" && (
                        <Button
                          component={Link}
                          to={`/${name}`}
                          onClick={onClose}
                          variant="outlined"
                          size="small"
                          sx={{
                            color: "#8B5CF6",
                            borderColor: "#8B5CF6",
                            "&:hover": {
                              borderColor: "#7C3AED",
                              backgroundColor: "rgba(139, 92, 246, 0.04)",
                            },
                            minWidth: "80px",
                          }}
                        >
                          View
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
              {totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </Stack>
          ) : (
            <Typography
              sx={{
                textAlign: "center",
                color: "text.secondary",
                py: 4,
              }}
            >
              {searchTerm
                ? "No names found matching your search"
                : "You don't own any names yet."}
            </Typography>
          )}
        </Box>
      </Modal>

      {modalMode === "setPrimary" && (
        <Dialog
          open={setNameModalOpen}
          onClose={() => setSetNameModalOpen(false)}
          aria-labelledby="set-name-dialog"
        >
          <DialogTitle sx={{ color: "#8B5CF6" }}>Set Primary Name</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Are you sure you want to set <strong>{selectedName}</strong> as
              your primary identifier?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This will be displayed as your primary identifier across the
              platform.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button
              onClick={() => setSetNameModalOpen(false)}
              sx={{
                color: "text.secondary",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetNameConfirm}
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: "#8B5CF6",
                "&:hover": {
                  bgcolor: "#7C3AED",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default MyNamesModal;
