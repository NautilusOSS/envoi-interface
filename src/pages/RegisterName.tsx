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
import { DEFAULT_PAYMENT_METHOD } from "@/layouts/EnvoiLayout";

const ALGORAND_ZERO_ADDRESS =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

const paymentAssetSymbol = "VOI";

const TRANSACTION_FEES = {
  createBalanceBox: 28500,
  deposit: 0,
  approve: 28501,
  register: 336700,
  setName: 336701,
};

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

  const priceLookup: Record<string, number> = {
    VOI: 2000,
    aUSDC: 5,
    UNIT: 50,
  };

  const [paymentAssetSymbol, setPaymentAssetSymbol] = useState<string>(
    () =>
      localStorage.getItem("preferredPaymentMethod") || DEFAULT_PAYMENT_METHOD
  );

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
    const basePrice = getNamePrice(name, priceLookup[paymentAssetSymbol]);
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
        <Typography variant="body2">
          Base Price: {basePrice} {paymentAssetSymbol}
        </Typography>
        <Typography variant="body2">Duration: {duration} year(s)</Typography>
        <Typography variant="body2">
          Total: {price} {paymentAssetSymbol}
        </Typography>
      </Box>
    );
  };

  const handleConfirmRegisterUNIT = async () => {
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
      setLoading(true);
      setError(null);
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(797609, algodClient, indexerClient, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      const UNIT = {
        tokenId: 420069,
        decimals: 8,
      };

      const vns = {
        registrar: 797609,
        resolver: 797608,
      };

      const builder = {
        arc200: new CONTRACT(
          UNIT.tokenId,
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
          vns.registrar,
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
          vns.resolver,
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

      let customR;
      for (const p0 of [0, 28500]) {
        const buildN = [];

        // Approve spending
        {
          const paramSpender = algosdk.getApplicationAddress(vns.registrar);
          const paramAmount = price * 10 ** UNIT.decimals;
          const txnO = (
            await builder.arc200.arc200_approve(paramSpender, paramAmount)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: p0,
            note: new TextEncoder().encode(
              `envoi arc200_approve ${price} ${paymentAssetSymbol} spending for ${name}.voi payment`
            ),
          });
        }

        // Register name
        {
          const paramName = stringToUint8Array(name, 32);
          const paramOwner = activeAccount.address;
          const paramDuration = Number(duration) * 365 * 24 * 60 * 60; // Convert years to seconds
          const txnO = (
            await builder.registrar[
              `register_${paymentAssetSymbol.toLowerCase()}`
            ](paramName, paramOwner, paramDuration)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 336700,
            note: new TextEncoder().encode(
              `envoi registrar register ${name}.voi for ${duration} years`
            ),
          });
        }

        // ----------------------------------------------------------------
        // TODO if first name for user setup reverse registrar as well
        // ----------------------------------------------------------------

        // set record name in resolver
        {
          const paramNode = await namehash(`${name}.voi`);
          const paramName = stringToUint8Array(`${name}.voi`, 256);
          const txnO = (await builder.resolver.setName(paramNode, paramName))
            ?.obj;
          buildN.push({
            ...txnO,
            payment: 336701,
            note: new TextEncoder().encode(
              `envoi resolver setName ${name}.voi`
            ),
          });
        }

        ci.setFee(15000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);

        customR = await ci.custom();
        console.log({ customR });
        if (customR.success) {
          break;
        }
      }
      if (!customR.success) {
        throw new Error("Failed to register name");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      setSuccess(true);
      enqueueSnackbar("Name registered successfully", {
        variant: "success",
      });
      setShowConfirmation(false);
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

  const handleConfirmRegisterVOI = async () => {
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
      setLoading(true);
      setError(null);
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(797609, algodClient, indexerClient, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      // const aUSDC = {
      //   asaAssetId: 302190,
      //   tokenId: 395614,
      // };

      const vns = {
        registrar: 797609,
        resolver: 797608,
      };

      const wVOI = {
        tokenId: 828295, // en Voi
      };

      const builder = {
        arc200: new CONTRACT(
          //aUSDC.tokenId,
          wVOI.tokenId,
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
          vns.registrar,
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
          vns.resolver,
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

      let customR;
      for (const p0 of [0, 28500]) {
        const buildN = [];

        // Deposit USDC (ASA -> ARC200)
        // {
        //   const txnO = (await builder.arc200.deposit(price * 1e6))?.obj;
        //   const assetTransfer = {
        //     xaid: aUSDC.asaAssetId,
        //     aamt: price * 1e6,
        //     payment: 28500,
        //   };
        //   buildN.push({
        //     ...txnO,
        //     ...assetTransfer,
        //   });
        // }

        // Create wVOI Balance for user
        if (p0 > 0) {
          const txnO = (
            await builder.arc200.createBalanceBox(activeAccount.address)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: p0,
            note: new TextEncoder().encode(
              `envoi createBalanceBox ${price} ${paymentAssetSymbol} for ${name}.voi payment`
            ),
          });
        }
        // Create wVOI balance for treasury (once)
        // {
        //   const txnO = (
        //     await builder.arc200.createBalanceBox(
        //       "BRB3JP4LIW5Q755FJCGVAOA4W3THJ7BR3K6F26EVCGMETLEAZOQRHHJNLQ"
        //     )
        //   )?.obj;
        //   buildN.push({
        //     ...txnO,
        //     payment: 28501,
        //   });
        // }

        // Deposit VOI (NET -> ARC200)
        {
          const txnO = (await builder.arc200.deposit(price * 1e6))?.obj;
          buildN.push({
            ...txnO,
            payment: price * 1e6,
            note: new TextEncoder().encode(
              `envoi deposit ${price} ${paymentAssetSymbol} for ${name}.voi payment`
            ),
          });
        }

        // Approve spending
        {
          const paramSpender = algosdk.getApplicationAddress(vns.registrar);
          const paramAmount = price * 1e6;
          const txnO = (
            await builder.arc200.arc200_approve(paramSpender, paramAmount)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 28501,
            note: new TextEncoder().encode(
              `envoi arc200_approve ${price} ${paymentAssetSymbol} spending for ${name}.voi payment`
            ),
          });
        }

        // Register name
        {
          const paramName = stringToUint8Array(name, 32);
          const paramOwner = activeAccount.address;
          const paramDuration = Number(duration) * 365 * 24 * 60 * 60; // Convert years to seconds
          const txnO = (
            await builder.registrar.register(
              paramName,
              paramOwner,
              paramDuration
            )
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 336700,
            note: new TextEncoder().encode(
              `envoi registrar register ${name}.voi for ${duration} years`
            ),
          });
        }

        // ----------------------------------------------------------------
        // TODO if first name for user setup reverse registrar as well
        // ----------------------------------------------------------------

        // set record name in resolver
        {
          const paramNode = await namehash(`${name}.voi`);
          const paramName = stringToUint8Array(`${name}.voi`, 256);
          const txnO = (await builder.resolver.setName(paramNode, paramName))
            ?.obj;
          buildN.push({
            ...txnO,
            payment: 336701,
            note: new TextEncoder().encode(
              `envoi resolver setName ${name}.voi`
            ),
          });
        }

        ci.setFee(15000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);

        customR = await ci.custom();
        if (customR.success) {
          break;
        }
      }

      if (!customR.success) {
        throw new Error("Failed to register name");
      }

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

  const handleConfirmRegister = async () => {
    switch (paymentAssetSymbol) {
      case "VOI":
        return handleConfirmRegisterVOI();
      case "UNIT":
        return handleConfirmRegisterUNIT();
      default:
        throw new Error("Unsupported payment method");
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
          Registration fees are non-refundable • Reserved names that are
          registered through means other than this official interface will be
          reclaimed and refunded • We reserve the right to reclaim and refund
          any reserved names that were registered through unofficial means
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

  const calculateTotalCost = () => {
    const totalFees =
      TRANSACTION_FEES.deposit +
      TRANSACTION_FEES.approve +
      TRANSACTION_FEES.register +
      TRANSACTION_FEES.setName;

    // Add createBalanceBox fee if needed (first-time users)
    // This is a simplified check - you might want to actually verify if the user needs this
    const mayNeedBalanceBox = true; // Replace with actual check
    const balanceBoxFee = mayNeedBalanceBox
      ? TRANSACTION_FEES.createBalanceBox
      : 0;

    return {
      namePrice: price,
      fees: (totalFees + balanceBoxFee) / 1e6,
      total: price + (totalFees + balanceBoxFee) / 1e6,
    };
  };

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
                  {price.toLocaleString()} {paymentAssetSymbol}
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
              Name Cost: {price.toLocaleString()} {paymentAssetSymbol}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Transaction Fees: {calculateTotalCost().fees.toLocaleString()} VOI
            </Typography>
            <Typography
              variant="body1"
              gutterBottom
              sx={{ fontWeight: "bold" }}
            >
              Total Cost:{" "}
              {paymentAssetSymbol === "VOI"
                ? `${calculateTotalCost().total.toLocaleString()} ${paymentAssetSymbol}`
                : `${calculateTotalCost().namePrice.toLocaleString()} ${paymentAssetSymbol} + ${calculateTotalCost().fees.toLocaleString()} VOI`}
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
