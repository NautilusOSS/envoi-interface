import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Slider,
  Stack,
  CircularProgress,
  Alert,
  InputAdornment,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Link,
} from "@mui/material";
import { APP_SPEC as VNSRegistrarSpec } from "@/clients/VNSRegistrarClient";
import { APP_SPEC as VNSResolverSpec } from "@/clients/VNSPublicResolverClient";
import { useSearchParams } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import algosdk from "algosdk";
import { getNamePrice } from "@/utils/price";
import InfoIcon from "@mui/icons-material/Info";
import { useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { RegistryService } from "@/services/registry";
import { debounce } from "lodash";
import { rsvps } from "@/constants/rsvps";
import { useNavigate } from "react-router-dom";

const ALGORAND_ZERO_ADDRESS =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

const formatCompactAddress = (address: string): string => {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const RegisterName: React.FC = () => {
  const { name: initialName } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState(
    initialName ? initialName.split(".")[0] : ""
  );
  const [nameError, setNameError] = useState("");
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { activeAccount, signTransactions } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isAvailable, setIsAvailable] = React.useState<boolean>(false);
  const [isChecking, setIsChecking] = React.useState<boolean>(false);

  useEffect(() => {
    if (initialName) {
      const fullName = `${initialName}.voi`;
      if (fullName in rsvps) {
        enqueueSnackbar(`${fullName} is reserved and cannot be registered`, {
          variant: "error",
          anchorOrigin: {
            vertical: "top",
            horizontal: "center",
          },
        });
        navigate("/");
        return;
      }
    }
  }, [initialName, navigate, enqueueSnackbar]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();

    const isValid = /^[a-z0-9-]*$/.test(value);
    if (isValid) {
      setName(value);
      setNameError("");
    } else {
      setNameError("Only lowercase letters, numbers, and hyphens are allowed");
    }
  };

  useEffect(() => {
    const basePrice = getNamePrice(name);
    const totalPrice = basePrice * parseInt(duration);
    setPrice(totalPrice);
  }, [name, duration]);

  const debouncedCheckAvailability = React.useMemo(
    () =>
      debounce(async (name: string) => {
        if (!name) return;

        try {
          setIsChecking(true);
          const registry = new RegistryService("mainnet");
          const owner = await registry.ownerOf(`${name}.voi`);
          console.log({ owner });

          // Name is available if it's owned by zero address or has no owner
          setIsAvailable(owner === ALGORAND_ZERO_ADDRESS || owner === null);
        } catch (error) {
          console.error("Error checking name availability:", error);
          setIsAvailable(false);
        } finally {
          setIsChecking(false);
        }
      }, 500),
    []
  );

  React.useEffect(() => {
    return () => {
      debouncedCheckAvailability.cancel();
    };
  }, [debouncedCheckAvailability]);

  useEffect(() => {
    debouncedCheckAvailability(name);
  }, [name, debouncedCheckAvailability]);

  const getPriceBreakdown = () => {
    const basePrice = getNamePrice(name);
    return (
      <Box>
        <Typography variant="body2">Cost Breakdown:</Typography>
        <Typography variant="body2">Base Price: {basePrice} USDC</Typography>
        <Typography variant="body2">Duration: {duration} year(s)</Typography>
        <Typography variant="body2">Total: {price} USDC</Typography>
      </Box>
    );
  };

  const handleConfirmRegister = async () => {
    if (!activeAccount) {
      enqueueSnackbar("Please connect your wallet to register a name", {
        variant: "error",
      });
      return;
    }

    const fullName = `${name}.voi`;
    const reservedOwner = rsvps[fullName];

    // Check if name is reserved and prevent registration if not the reserved owner
    if (reservedOwner && reservedOwner !== activeAccount.address) {
      enqueueSnackbar(`${fullName} is reserved and cannot be registered`, {
        variant: "error",
        anchorOrigin: {
          vertical: "top",
          horizontal: "center",
        },
      });
      return;
    }

    try {
      console.log({
        name,
        duration,
        price,
      });

      setLoading(true);
      setError(null);
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(797609, algodClient, indexerClient, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      const aUSDC = {
        asaAssetId: 302190,
        tokenId: 395614,
      };

      const builder = {
        arc200: new CONTRACT(
          aUSDC.tokenId,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        registrar: new CONTRACT(
          797609,
          algodClient,
          indexerClient,
          {
            name: "registrar",
            description: "Registrar",
            methods: VNSRegistrarSpec.contract.methods,
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        resolver: new CONTRACT(
          797608,
          algodClient,
          indexerClient,
          {
            name: "resolver",
            description: "Resolver",
            methods: VNSResolverSpec.contract.methods,
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // Deposit USDC (ASA -> ARC200)
      {
        const txnO = (await builder.arc200.deposit(price * 1e6))?.obj;
        const assetTransfer = {
          xaid: aUSDC.asaAssetId,
          aamt: price * 1e6,
          payment: 28500,
        };
        buildN.push({
          ...txnO,
          ...assetTransfer,
        });
      }

      // Approve spending
      {
        const paramSpender = algosdk.getApplicationAddress(797609);
        const paramAmount = price * 1e6;
        const txnO = (
          await builder.arc200.arc200_approve(paramSpender, paramAmount)
        )?.obj;
        buildN.push({
          ...txnO,
          payment: 28100,
        });
      }

      // Register name
      {
        const paramName = stringToUint8Array(name, 32);
        const paramOwner = activeAccount.address;
        const paramDuration = Number(duration) * 365 * 24 * 60 * 60; // Convert years to seconds
        const txnO = (
          await builder.registrar.register(paramName, paramOwner, paramDuration)
        )?.obj;
        buildN.push({
          ...txnO,
          payment: 336700,
        });
      }

      // ----------------------------------------------------------------
      // TODO if first name for user setup reverse registrar as well
      // ----------------------------------------------------------------

      // set record name in resolver
      {
        const paramNode = await namehash(`${name}.voi`);
        const paramName = stringToUint8Array(`${name}.voi`, 256);
        console.log({
          paramNode,
          paramName,
        });
        const txnO = (await builder.resolver.setName(paramNode, paramName))
          ?.obj;
        buildN.push({
          ...txnO,
        });
      }

      ci.setFee(15000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);

      const customR = await ci.custom();

      console.log({
        customR,
      });

      if (customR.success) {
        const stxns = await signTransactions(
          customR.txns.map(
            (t: string) => new Uint8Array(Buffer.from(t, "base64"))
          )
        );

        await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
        setSuccess(true);
        enqueueSnackbar("Name registered successfully!", {
          variant: "success",
        });
        setShowConfirmation(false);
      }
    } catch (err) {
      console.error("Error registering name:", err);
      setError(err instanceof Error ? err.message : "Failed to register name");
      enqueueSnackbar("Failed to register name. Please try again.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a reusable Terms of Service modal component
  const TermsOfServiceModal = () => (
    <Dialog
      open={showTermsModal}
      onClose={() => setShowTermsModal(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Terms of Service</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Last updated: 14 December 2024
        </Typography>

        <Typography variant="body1" paragraph>
          1. Name Registration
        </Typography>
        <Typography variant="body2" paragraph>
          • Names are registered on a first-come, first-served basis •
          Registration fees are non-refundable • Reserved names that are registered 
          through means other than this official interface will be reclaimed and 
          refunded • We reserve the right to reclaim and refund any reserved names 
          that were registered through unofficial means
        </Typography>

        <Typography variant="body1" paragraph>
          2. Acceptable Use
        </Typography>
        <Typography variant="body2" paragraph>
          • Names must not infringe on trademarks or intellectual property •
          Names must not contain offensive or inappropriate content • We reserve
          the right to revoke names that violate these terms
        </Typography>

        <Typography variant="body1" paragraph>
          3. Duration and Renewal
        </Typography>
        <Typography variant="body2" paragraph>
          • Registrations are valid for the selected duration • Names can be
          renewed before expiration • Expired names become available for
          registration by others
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowTermsModal(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const isReserved = `${name}.voi` in rsvps;
  const reservedOwner = isReserved ? rsvps[`${name}.voi`] : null;
  const isReservedOwner = activeAccount?.address === reservedOwner;

  return (
    <>
      <Container
        maxWidth="sm"
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <Box sx={{ width: "100%" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Register Name
          </Typography>

          {!activeAccount && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please connect your wallet to register a name
            </Alert>
          )}

          {isReserved && !isReservedOwner && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                "& .MuiAlert-message": {
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                },
              }}
            >
              <Typography variant="body1" fontWeight={500}>
                This name is reserved
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Owner: {formatCompactAddress(reservedOwner || "")}
              </Typography>
            </Alert>
          )}

          <Paper
            sx={{
              p: 4,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <Stack spacing={4}>
              <TextField
                fullWidth
                label="Name"
                value={`${name}`}
                onChange={handleNameChange}
                sx={{
                  "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: "#000000",
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">.voi</InputAdornment>
                  ),
                }}
                error={!!nameError}
                helperText={nameError}
              />

              <Box>
                <Typography gutterBottom>
                  Duration: {duration} {duration === 1 ? "year" : "years"}
                </Typography>
                <Slider
                  value={duration}
                  onChange={(_, value) => setDuration(value as number)}
                  min={1}
                  max={5}
                  marks
                  step={1}
                  disabled={loading}
                  sx={{
                    color: "#8B5CF6",
                    "& .MuiSlider-mark": {
                      backgroundColor: "#8B5CF6",
                    },
                  }}
                />
              </Box>

              <Box sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <Typography variant="h6">Total Price</Typography>
                  <Tooltip title={getPriceBreakdown()} arrow>
                    <IconButton size="small">
                      <HelpOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="h4" color="primary" gutterBottom>
                  {price.toLocaleString()} USDC
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Successfully registered {name}.voi!
                </Alert>
              )}

              {isChecking ? (
                <CircularProgress size={20} />
              ) : !name ? (
                <Button
                  variant="contained"
                  size="large"
                  disabled
                  sx={{
                    bgcolor: "#E5E7EB",
                    color: "#9CA3AF",
                    height: "48px",
                    borderRadius: "24px",
                    "&.Mui-disabled": {
                      bgcolor: "#E5E7EB",
                      color: "#9CA3AF",
                    },
                  }}
                >
                  Register
                </Button>
              ) : !isAvailable && !isReservedOwner ? (
                <Typography
                  color="error"
                  sx={{
                    textAlign: "center",
                    fontWeight: 500,
                  }}
                >
                  {isReserved
                    ? "This name is reserved and cannot be registered"
                    : "This name is already registered"}
                </Typography>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setShowConfirmation(true)}
                  disabled={
                    loading ||
                    !name ||
                    !activeAccount ||
                    !!nameError ||
                    (isReserved && !isReservedOwner)
                  }
                  sx={{
                    bgcolor: "#8B5CF6",
                    "&:hover": {
                      bgcolor: "#7C3AED",
                    },
                    height: "48px",
                    borderRadius: "24px",
                    "&.Mui-disabled": {
                      bgcolor: "#E5E7EB",
                      color: "#9CA3AF",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: "white" }} />
                  ) : (
                    "Register"
                  )}
                </Button>
              )}
            </Stack>
          </Paper>
        </Box>

        <Box
          sx={{
            textAlign: "center",
            mt: 2,
            mb: 4,
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">
            By reserving a name, you acknowledge and agree to our{" "}
            <Link
              component="button"
              variant="body2"
              onClick={() => setShowTermsModal(true)}
              sx={{
                textDecoration: "underline",
                "&:hover": {
                  cursor: "pointer",
                },
              }}
            >
              Terms of Service
            </Link>
            .
          </Typography>
        </Box>

        {/* Confirmation Modal */}
        <Dialog
          open={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirm Registration</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              You are about to register:
            </Typography>
            <Typography variant="h6" gutterBottom>
              {name}.voi
            </Typography>
            <Typography variant="body1" gutterBottom>
              Duration: {duration} year(s)
            </Typography>
            <Typography variant="body1" gutterBottom>
              Total Cost: {price.toLocaleString()} USDC
            </Typography>

            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the{" "}
                    <Link
                      component="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      sx={{
                        textDecoration: "underline",
                        "&:hover": {
                          cursor: "pointer",
                        },
                      }}
                    >
                      Terms of Service
                    </Link>{" "}
                    and understand that name registrations are final and
                    non-refundable.
                  </Typography>
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowConfirmation(false);
                setTermsAccepted(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRegister}
              variant="contained"
              disabled={loading || !termsAccepted}
            >
              {loading ? <CircularProgress size={24} /> : "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Shared Terms of Service Modal */}
        <TermsOfServiceModal />
      </Container>
    </>
  );
};

export default RegisterName;
