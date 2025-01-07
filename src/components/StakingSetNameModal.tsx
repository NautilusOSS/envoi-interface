import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  TextField,
  Pagination,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import axios from "axios";
import { StakingContract } from "./types";

interface StakingSetNameModalProps {
  contract: StakingContract;
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  onNameSelected: (name: string, contract: StakingContract) => void;
}

const StakingSetNameModal: React.FC<StakingSetNameModalProps> = ({
  contract,
  open,
  onClose,
  contractAddress,
  onNameSelected,
}) => {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeAccount } = useWallet();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchOwnedNames = async () => {
      if (!activeAccount?.address) return;

      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=797609&owner=${activeAccount.address}`
          //`https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=797609&owner=BRB3JP4LIW5Q755FJCGVAOA4W3THJ7BR3K6F26EVCGMETLEAZOQRHHJNLQ`
        );
        const ownedNames = res.data.tokens.map((token: any) => {
          const metadata = JSON.parse(token.metadata || "{}");
          return metadata.name;
        });
        setNames(ownedNames);
      } catch (err) {
        console.error("Error fetching owned names:", err);
        setError("Failed to fetch owned names. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    console.log({ names });

    if (open) {
      fetchOwnedNames();
    }
  }, [open, activeAccount]);

  const handleNameSelect = (name: string, contract: StakingContract) => {
    onNameSelected(name, contract);
    onClose();
  };

  const filteredNames = names.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredNames.length / itemsPerPage);
  const displayedNames = filteredNames.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Name for Contract</DialogTitle>
      <DialogContent>
        {loading ? (
          <CircularProgress sx={{ display: "block", margin: "20px auto" }} />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : names.length === 0 ? (
          <Alert severity="info">You don't own any names yet.</Alert>
        ) : (
          <>
            <TextField
              fullWidth
              label="Search names"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
            />
            <List>
              {displayedNames.map((name: string) => (
                <ListItem key={name} disablePadding>
                  <ListItemButton
                    onClick={() => handleNameSelect(name, contract)}
                  >
                    <ListItemText primary={name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            {pageCount > 1 && (
              <Pagination
                count={pageCount}
                page={page}
                onChange={handlePageChange}
                sx={{ mt: 2, display: "flex", justifyContent: "center" }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StakingSetNameModal;
