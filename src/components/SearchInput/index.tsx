import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Fade,
  CircularProgress,
  IconButton,
  useTheme,
  InputAdornment,
  Divider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import HistoryIcon from "@mui/icons-material/History";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate } from "react-router-dom";
import { debounce } from "lodash";
import SearchService, { SearchSuggestion, SearchResult } from "../../services/SearchService";

interface SearchInputProps {
  placeholder?: string;
  variant?: "navbar" | "page";
  onSearch?: (query: string) => void;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
  fullWidth?: boolean;
  autoFocus?: boolean;
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "registered":
        return { bg: "rgba(76, 175, 80, 0.1)", color: "#4CAF50" };
      case "available":
        return { bg: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6" };
      case "reserved":
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
        textTransform: "capitalize",
      }}
    />
  );
};

const formatCompactAddress = (address: string | undefined): string => {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search names, addresses, collections...",
  variant = "page",
  onSearch,
  onResultClick,
  className,
  fullWidth = true,
  autoFocus = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const theme = useTheme();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchService = SearchService.getInstance();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      // Get search results from service
      const searchResults = await searchService.search(query);
      setResults(searchResults);
      setShowResults(true);
      
      // Get suggestions
      const searchSuggestions = searchService.getSuggestions(query);
      setSuggestions(searchSuggestions);
      setShowSuggestions(searchSuggestions.length > 0);
      
      onSearch?.(query);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, 200); // Reduced from 300ms to 200ms for better responsiveness

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showResults && !showSuggestions) return;

      const totalItems = results.length + suggestions.length;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => 
            prev < totalItems - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          event.preventDefault();
          if (selectedIndex >= 0) {
            if (selectedIndex < results.length) {
              handleResultClick(results[selectedIndex]);
            } else {
              const suggestionIndex = selectedIndex - results.length;
              handleSuggestionClick(suggestions[suggestionIndex]);
            }
          }
          break;
        case "Escape":
          setShowResults(false);
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showResults, showSuggestions, selectedIndex, results, suggestions]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSelectedIndex(-1);
    
    if (onResultClick) {
      onResultClick(result);
    } else {
      // Default navigation behavior
      switch (result.type) {
        case "name":
          if (result.status === "available") {
            const baseName = result.title.replace(".voi", "");
            navigate(`/register/${baseName}`);
          } else {
            navigate(`/${result.title}`);
          }
          break;
        case "address":
          navigate(`/account/${result.id}`);
          break;
        case "collection":
          navigate(`/collection/${result.id}`);
          break;
        case "nft":
          navigate(`/nft/${result.id}`);
          break;
      }
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.query);
    setShowResults(false);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Trigger search for the suggestion
    debouncedSearch(suggestion.query);
  };

  const handleInputFocus = () => {
    if (results.length > 0 || suggestions.length > 0) {
      setShowResults(results.length > 0);
      setShowSuggestions(suggestions.length > 0);
    } else if (!searchTerm.trim()) {
      // Show recent searches when focused with empty input
      const recentSearches = searchService.getRecentSearches(5);
      const recentSuggestions: SearchSuggestion[] = recentSearches.map(item => ({
        query: item.query,
        type: "history",
      }));
      setSuggestions(recentSuggestions);
      setShowSuggestions(recentSuggestions.length > 0);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for clicks on results
    setTimeout(() => {
      setShowResults(false);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  const getResultIcon = (type: string, title?: string) => {
    switch (type) {
      case "name":
        // Different icons for different domains
        if (title?.includes('.founder.voi')) {
          return <AccountCircleIcon sx={{ color: "#FF6B35" }} />; // Orange for founder.voi
        }
        return <AccountCircleIcon sx={{ color: "#8B5CF6" }} />; // Purple for .voi
      case "address":
        return <AccountCircleIcon sx={{ color: "#4CAF50" }} />;
      case "collection":
        return <AccountCircleIcon sx={{ color: "#FF9800" }} />;
      case "nft":
        return <AccountCircleIcon sx={{ color: "#2196F3" }} />;
      default:
        return <AccountCircleIcon sx={{ color: "#8B5CF6" }} />;
    }
  };

  const getResultAvatarColor = (type: string, title?: string) => {
    switch (type) {
      case "name":
        // Different colors for different domains
        if (title?.includes('.founder.voi')) {
          return "rgba(255, 107, 53, 0.1)"; // Orange for founder.voi
        }
        return "rgba(139, 92, 246, 0.1)"; // Purple for .voi
      case "address":
        return "rgba(76, 175, 80, 0.1)";
      case "collection":
        return "rgba(255, 152, 0, 0.1)";
      case "nft":
        return "rgba(33, 150, 243, 0.1)";
      default:
        return "rgba(139, 92, 246, 0.1)";
    }
  };

  const isNavbarVariant = variant === "navbar";

  return (
    <Box
      sx={{
        position: "relative",
        width: fullWidth ? "100%" : "auto",
        maxWidth: isNavbarVariant ? "400px" : "420px",
      }}
      className={className}
    >
      <TextField
        ref={inputRef}
        fullWidth={fullWidth}
        placeholder={placeholder}
        variant="outlined"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        autoFocus={autoFocus}
        InputProps={{
          sx: {
            borderRadius: isNavbarVariant ? 1 : 2,
            fontSize: isNavbarVariant ? "0.9rem" : isMobile ? "1rem" : "1.1rem",
            backgroundColor: "background.paper",
            "& input": {
              padding: isNavbarVariant ? "8px 12px" : isMobile ? "16px 14px" : "20px 14px",
              fontSize: isNavbarVariant ? "0.9rem" : isMobile ? "1rem" : "1.2rem",
              height: isNavbarVariant ? "20px" : isMobile ? "24px" : "28px",
            },
          },
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon 
                sx={{ 
                  color: "text.secondary",
                  fontSize: isNavbarVariant ? "1.2rem" : isMobile ? "1.3rem" : "1.4rem",
                }} 
              />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={handleClear}
                edge="end"
                size={isNavbarVariant ? "small" : isMobile ? "medium" : "medium"}
                sx={{
                  width: isNavbarVariant ? "32px" : isMobile ? "44px" : "48px",
                  height: isNavbarVariant ? "32px" : isMobile ? "44px" : "48px",
                }}
              >
                <ClearIcon sx={{ fontSize: isNavbarVariant ? "1.2rem" : isMobile ? "1.3rem" : "1.4rem" }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        InputLabelProps={{
          sx: {
            fontSize: isNavbarVariant ? "0.9rem" : isMobile ? "1rem" : "1.1rem",
            transform: isNavbarVariant 
              ? "translate(14px, 12px) scale(1)" 
              : isMobile
              ? "translate(14px, 20px) scale(1)"
              : "translate(14px, 24px) scale(1)",
            "&.Mui-focused, &.MuiInputLabel-shrink": {
              transform: isNavbarVariant
                ? "translate(14px, -9px) scale(0.75)"
                : "translate(14px, -9px) scale(0.75)",
            },
          },
        }}
      />

      <Fade in={(showResults && results.length > 0) || (showSuggestions && suggestions.length > 0)}>
        <Paper
          ref={resultsRef}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            mt: 1,
            borderRadius: 2,
            zIndex: 1000,
            maxHeight: isMobile ? "300px" : "400px",
            overflow: "auto",
            boxShadow: theme.shadows[3],
            backgroundColor: "background.paper",
            // Mobile-specific optimizations
            ...(isMobile && {
              maxWidth: "100vw",
              marginLeft: "-16px",
              marginRight: "-16px",
              borderRadius: 0,
              borderTop: `1px solid ${theme.palette.divider}`,
            }),
          }}
        >
          <List>
            {isSearching ? (
              <ListItem>
                <ListItemText 
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <CircularProgress size={20} />
                      <Typography>Searching...</Typography>
                    </Box>
                  }
                />
              </ListItem>
            ) : (
              <>
                {/* Search Results */}
                {results.map((result, index) => (
                  <ListItem
                    key={result.id}
                    button
                    onClick={() => handleResultClick(result)}
                    sx={{
                      backgroundColor: selectedIndex === index 
                        ? "rgba(139, 92, 246, 0.08)" 
                        : "transparent",
                      "&:hover": {
                        backgroundColor: "rgba(139, 92, 246, 0.08)",
                      },
                      transition: "background-color 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      // Mobile touch optimization
                      minHeight: isMobile ? "56px" : "48px",
                      padding: isMobile ? "12px 16px" : "8px 16px",
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getResultAvatarColor(result.type, result.title) }}>
                        {getResultIcon(result.type, result.title)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography
                            sx={{
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                            }}
                          >
                            {result.title}
                          </Typography>
                          {result.type === "name" && (
                            <Chip
                              label={result.title.includes('.founder.voi') ? 'Founder' : 'Standard'}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                backgroundColor: result.title.includes('.founder.voi') 
                                  ? "rgba(255, 107, 53, 0.1)" 
                                  : "rgba(139, 92, 246, 0.1)",
                                color: result.title.includes('.founder.voi') 
                                  ? "#FF6B35" 
                                  : "#8B5CF6",
                                fontWeight: 500,
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={result.subtitle}
                      secondaryTypographyProps={{
                        sx: {
                          color: theme.palette.text.secondary,
                          fontFamily: result.type === "address" ? "monospace" : "inherit",
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
                      {result.status && <StatusChip status={result.status} />}
                      <ChevronRightIcon
                        sx={{
                          color: result.status === "available" ? "#8B5CF6" : "text.secondary",
                          opacity: result.status === "reserved" ? 0.5 : 1,
                        }}
                      />
                    </Box>
                  </ListItem>
                ))}

                {/* Divider between results and suggestions */}
                {results.length > 0 && suggestions.length > 0 && (
                  <Divider sx={{ my: 1 }} />
                )}

                {/* Suggestions */}
                {suggestions.map((suggestion, index) => {
                  const actualIndex = results.length + index;
                  return (
                    <ListItem
                      key={`suggestion-${suggestion.query}`}
                      button
                      onClick={() => handleSuggestionClick(suggestion)}
                      sx={{
                        backgroundColor: selectedIndex === actualIndex 
                          ? "rgba(139, 92, 246, 0.08)" 
                          : "transparent",
                        "&:hover": {
                          backgroundColor: "rgba(139, 92, 246, 0.08)",
                        },
                        transition: "background-color 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        // Mobile touch optimization
                        minHeight: isMobile ? "56px" : "48px",
                        padding: isMobile ? "12px 16px" : "8px 16px",
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: suggestion.type === "history" 
                            ? "rgba(139, 92, 246, 0.1)" 
                            : "rgba(255, 152, 0, 0.1)" 
                        }}>
                          {suggestion.type === "history" ? (
                            <HistoryIcon sx={{ color: "#8B5CF6" }} />
                          ) : (
                            <TrendingUpIcon sx={{ color: "#FF9800" }} />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={suggestion.query}
                        secondary={
                          suggestion.type === "history" 
                            ? "Recent search" 
                            : suggestion.count 
                            ? `${suggestion.count} searches` 
                            : "Popular"
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
                            fontSize: "0.75rem",
                          },
                        }}
                      />
                      <ChevronRightIcon
                        sx={{
                          color: "text.secondary",
                          opacity: 0.7,
                        }}
                      />
                    </ListItem>
                  );
                })}
              </>
            )}
          </List>
        </Paper>
      </Fade>
    </Box>
  );
};

export default SearchInput;
