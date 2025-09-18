import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  useTheme,
  Fade,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchInput from "../SearchInput";
import { useGlobalSearchShortcut } from "../../hooks/useKeyboardShortcut";

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ open, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useTheme();

  // Focus the search input when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        const searchInput = document.querySelector('[data-testid="global-search-input"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    } else {
      setSearchQuery("");
    }
  }, [open]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleResultClick = () => {
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[8],
          maxHeight: "80vh",
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              Search
            </Typography>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              position: "relative",
            }}
          >
            <SearchInput
              variant="page"
              placeholder="Search names, addresses, collections, NFTs..."
              onSearch={handleSearch}
              onResultClick={handleResultClick}
              autoFocus={true}
              className="global-search-input"
            />
          </Box>

          <Fade in={searchQuery.length > 0}>
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: theme.palette.action.hover,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: "0.875rem",
                }}
              >
                Press <kbd style={{ 
                  backgroundColor: theme.palette.background.default,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  border: `1px solid ${theme.palette.divider}`,
                }}>Esc</kbd> to close, <kbd style={{ 
                  backgroundColor: theme.palette.background.default,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  border: `1px solid ${theme.palette.divider}`,
                }}>↑↓</kbd> to navigate, <kbd style={{ 
                  backgroundColor: theme.palette.background.default,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  border: `1px solid ${theme.palette.divider}`,
                }}>Enter</kbd> to select
              </Typography>
            </Box>
          </Fade>
        </Box>

        {/* Search results will be displayed by the SearchInput component */}
        <Box
          sx={{
            minHeight: "200px",
            p: 2,
          }}
        >
          {searchQuery.length === 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                textAlign: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 1,
                }}
              >
                Start typing to search
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  opacity: 0.7,
                }}
              >
                Search for .voi names, wallet addresses, collections, and NFTs
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchModal;
