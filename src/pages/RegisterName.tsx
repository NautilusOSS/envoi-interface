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
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSReverseRegistrarSpec } from "@/clients/ReverseRegistrarClient";
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
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import BigNumber from "bignumber.js";
import { stripTrailingZeroBytes } from "@/utils/string";

const ALGORAND_ZERO_ADDRESS =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

export const TRANSACTION_FEES = {
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
  const { name: initialName, subname: initialSubname } = useParams<{
    name: string;
    subname: string;
  }>();
  const navigate = useNavigate();
  const [name, setName] = useState(
    initialSubname
      ? initialSubname.split(".")[0]
      : initialName
      ? initialName.split(".")[0]
      : ""
  );
  const [parentName, setParentName] = useState(
    initialSubname ? initialName : "voi"
  );
  const [parentAppId, setParentAppId] = useState(797609); // voi registrar
  const [paymentToken, setPaymentToken] = useState(828295); // en Voi
  const [paymentTokenDecimals, setPaymentTokenDecimals] = useState(6); // en Voi decimals
  const [paymentTokenSymbol, setPaymentTokenSymbol] = useState("VOI"); // en Voi symbol

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
  const [isLoadingPaymentToken, setIsLoadingPaymentToken] =
    React.useState<boolean>(false);
  const [subnameRegistrarBaseCost, setSubnameRegistrarBaseCost] =
    React.useState<number | null>(null);
  const [subnameRegistrarAvailable, setSubnameRegistrarAvailable] =
    React.useState<boolean>(true);
  const [registrarOwner, setRegistrarOwner] = React.useState<string | null>(
    null
  );
  const [userPrimaryName, setUserPrimaryName] = React.useState<string | null>(
    null
  );

  // TODO get price from registrar
  const priceLookup: Record<string, number> = {
    VOI: 2000,
    aUSDC: 5,
    UNIT: 50,
  };
  const basePrice = 2000;

  const paymentAssetSymbol = useSelector(
    (state: RootState) => state.user.paymentMethod
  );

  const symbolOverride = (symbol: string) => {
    switch (symbol) {
      case "EV":
      case "VOI":
        return "VOI";
      default:
        return symbol;
    }
  };

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
    // Use base cost from subname_registrar if available, otherwise use default
    const effectiveBasePrice = subnameRegistrarBaseCost || basePrice;
    const namePrice = getNamePrice(name, effectiveBasePrice);
    const totalPrice = namePrice * parseInt(duration.toString());
    setPrice(totalPrice);
  }, [
    name,
    duration,
    paymentAssetSymbol,
    showConfirmation,
    subnameRegistrarBaseCost,
  ]);

  const debouncedCheckAvailability = React.useMemo(
    () =>
      debounce(async (name: string) => {
        if (!name) return;

        try {
          setIsChecking(true);
          const registry = new RegistryService("mainnet");
          const owner = await registry.ownerOf(`${name}.${parentName}`);
          console.log({ owner });

          // Check if base_cost is 0 - if so, not available for sale
          const isBaseCostZero = subnameRegistrarBaseCost === 0;

          // Name is available if it's owned by zero address or has no owner AND base_cost is not 0
          setIsAvailable(
            (owner === ALGORAND_ZERO_ADDRESS || owner === null) &&
              !isBaseCostZero
          );
        } catch (error) {
          console.error("Error checking name availability:", error);
          setIsAvailable(false);
        } finally {
          setIsChecking(false);
        }
      }, 500),
    [subnameRegistrarBaseCost]
  );

  React.useEffect(() => {
    return () => {
      debouncedCheckAvailability.cancel();
    };
  }, [debouncedCheckAvailability]);

  useEffect(() => {
    debouncedCheckAvailability(name);
  }, [name, debouncedCheckAvailability, subnameRegistrarBaseCost]);

  // Fetch user's primary name
  useEffect(() => {
    if (!activeAccount?.address) {
      setUserPrimaryName(null);
      return;
    }

    (async () => {
      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ciResolver = new CONTRACT(
          797608, // VNS Public Resolver
          algodClient,
          indexerClient,
          { ...VNSResolverSpec.contract, events: [] },
          {
            addr: algosdk.getApplicationAddress(797608),
            sk: new Uint8Array(),
          }
        );

        // Check if reverse node exists for this address
        const nameR = await ciResolver.name(
          await namehash(`${activeAccount.address}.addr.reverse`)
        );

        if (!nameR.success) {
          setUserPrimaryName(null);
          return;
        }

        const primaryNameValue = stripTrailingZeroBytes(nameR.returnValue);
        setUserPrimaryName(primaryNameValue || null);
        console.log("User primary name:", primaryNameValue);
      } catch (error) {
        console.error("Error fetching user primary name:", error);
        setUserPrimaryName(null);
      }
    })();
  }, [activeAccount?.address]);

  const getPriceBreakdown = () => {
    // Use base cost from subname_registrar if available, otherwise use priceLookup
    const effectiveBasePrice =
      subnameRegistrarBaseCost || priceLookup[paymentTokenSymbol] || basePrice;
    const namePrice = getNamePrice(name, effectiveBasePrice);
    return (
      <Box>
        <Typography variant="body2">Cost Breakdown:</Typography>
        <Typography variant="body2">
          Name Price ({name.length} chars): {namePrice}{" "}
          {symbolOverride(paymentTokenSymbol)}
        </Typography>
        <Typography variant="body2">Duration: {duration} year(s)</Typography>
        <Typography variant="body2">
          Total: {price} {symbolOverride(paymentTokenSymbol)}
        </Typography>
      </Box>
    );
  };

  const handleConfirmRegisterVOI = async () => {
    if (!activeAccount) {
      enqueueSnackbar("Please connect your wallet to register a name", {
        variant: "error",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        parentAppId,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      const vns = {
        registrar: parentAppId,
        resolver: 797608,
        reverseRegistrar: 797610,
      };

      const tok = {
        tokenId: paymentToken, // en Voi
        decimals: paymentTokenDecimals,
        symbol: paymentTokenSymbol,
      };

      console.log("tok", tok);

      const builder = {
        arc200: new CONTRACT(
          tok.tokenId,
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
        reverseRegistrar: new CONTRACT(
          vns.reverseRegistrar,
          algodClient,
          indexerClient,
          { ...VNSReverseRegistrarSpec.contract, events: [] },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
      };

      const priceBI = BigInt(
        new BigNumber(price * duration)
          .multipliedBy(new BigNumber(10).pow(tok.decimals))
          .toFixed(0)
      );

      let customR;
      // p0: createBalanceBox user (once)
      // p1: deposit (wnt or wnnt)
      // p2: create balance box owner of registrar (once)
      for (const p of [
        [0, 0, 0], // returning user arc200
        [1, 1, 0], // brand new user wnt/wnnt
        [0, 0, 0], // brand new user arc200
        [0, 1, 0], // returning user wnt/wnnt
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
        [1, 1, 1],
      ]) {
        const [p0, p1, p2] = p;
        const buildN = [];

        // create balance box user
        if (p0 > 0) {
          const txnO = (
            await builder.arc200.createBalanceBox(activeAccount.address)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 28500,
            note: new TextEncoder().encode(
              `envoi createBalanceBox for ${activeAccount.address}`
            ),
          });
        }

        // deposit
        if (p1 > 0) {
          const txnO = (await builder.arc200.deposit(priceBI))?.obj;
          // TODO handle axfers
          buildN.push({
            ...txnO,
            payment: priceBI,
            note: new TextEncoder().encode(
              `envoi deposit ${price} ${paymentTokenSymbol} for ${name}.voi payment`
            ),
          });
        }

        // create balance box owner of registrar
        if (p2 > 0) {
          const txnO = (await builder.arc200.createBalanceBox(registrarOwner))
            ?.obj;
          buildN.push({
            ...txnO,
            payment: 28501,
            note: new TextEncoder().encode(
              `envoi createBalanceBox for ${registrarOwner}`
            ),
          });
        }

        // attempt to setup reverse address register and primary name assignment
        // if (p3 > 0) {
        //   const txnO = (
        //     await builder.reverseRegistrar.register(
        //       algosdk.decodeAddress(activeAccount.address).publicKey,
        //       activeAccount.address,
        //       0
        //     )
        //   )?.obj;
        //   buildN.push({
        //     ...txnO,
        //     payment: 28502,
        //     note: new TextEncoder().encode(
        //       `envoi register ${activeAccount.address}.addr.reverse`
        //     ),
        //   });
        // }
        // if (!userPrimaryName) {
        //   {
        //     const txnO = (
        //       await builder.resolver.setName(
        //         await namehash(`${activeAccount.address}.addr.reverse`),
        //         stringToUint8Array(`${name}.${parentName}`)
        //       )
        //     )?.obj;
        //     buildN.push({
        //       ...txnO,
        //       note: new TextEncoder().encode(
        //         `envoi resolver setName ${activeAccount.address}.addr.reverse ${name}`
        //       ),
        //     });
        //   }
        // }

        // approve spending
        {
          const paramSpender = algosdk.getApplicationAddress(vns.registrar);
          const txnO = (
            await builder.arc200.arc200_approve(paramSpender, priceBI)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 28502,
            note: new TextEncoder().encode(
              `envoi arc200_approve ${
                price * duration
              } ${paymentTokenSymbol} spending for ${name}.${parentName} payment to ${algosdk.getApplicationAddress(
                vns.registrar
              )}`
            ),
          });
        }

        // arc200 transfer to owner of registrar
        {
          const txnO = (await builder.arc200.arc200_transfer(registrarOwner, 0))
            ?.obj;
          buildN.push({
            ...txnO,
            payment: 28503,
            note: new TextEncoder().encode(
              `envoi arc200 transfer to owner of registrar ${registrarOwner}`
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
            payment: parentName === "wallet.voi" ? 0 : 336700,
            note: new TextEncoder().encode(
              `envoi registrar register ${name}.${parentName} for ${duration} years`
            ),
          });
        }

        // ----------------------------------------------------------------
        // TODO if first name for user setup reverse registrar as well
        // ----------------------------------------------------------------

        // set record name in resolver
        {
          const paramNode = await namehash(`${name}.${parentName}`);
          const paramName = stringToUint8Array(`${name}.${parentName}`, 256);
          const txnO = (await builder.resolver.setName(paramNode, paramName))
            ?.obj;
          buildN.push({
            ...txnO,
            payment: 336701,
            note: new TextEncoder().encode(
              `envoi resolver setName ${name}.${parentName}`
            ),
          });
        }

        ci.setFee(20000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);

        customR = await ci.custom();

        console.log("customR.error", customR.error);

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

      // Navigate to profile page after a short delay to show success message
      enqueueSnackbar("Redirecting to profile page...", {
        variant: "info",
      });
      setTimeout(() => {
        navigate(`/${name}.${parentName}`);
      }, 10000);
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

  const isReserved = `${name}.${parentName}` in rsvps;
  const reservedOwner = isReserved ? rsvps[`${name}.${parentName}`] : null;
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

  // resolver parent app id from parent name
  useEffect(() => {
    if (!parentName) return;

    console.log("Loading payment token for parent name:", parentName);
    const { algodClient, indexerClient } = getAlgorandClients();

    (async () => {
      try {
        setIsLoadingPaymentToken(true);
        let appId = parentAppId; // Default to current parentAppId

        // For non-voi parent names, look up the registrar app ID using subname_registrar text record
        if (parentName !== "voi") {
          try {
            // First try to get the subname_registrar text record from the resolver
            const ciResolver = new CONTRACT(
              Number(797608), // VNS Public Resolver
              algodClient,
              indexerClient,
              { ...VNSResolverSpec.contract, events: [] },
              {
                addr:
                  activeAccount?.address ||
                  algosdk.getApplicationAddress(797608),
                sk: new Uint8Array(),
              }
            );

            const subnameRegistrarR = await ciResolver.text(
              await namehash(parentName),
              stringToUint8Array("subname_registrar", 22)
            );

            if (subnameRegistrarR.success && subnameRegistrarR.returnValue) {
              const subnameRegistrarData = JSON.parse(
                subnameRegistrarR.returnValue.replace(/\0+$/, "")
              );
              if (subnameRegistrarData.contract) {
                appId = Number(subnameRegistrarData.contract);
                setParentAppId(appId);
                setSubnameRegistrarAvailable(true);
                console.log(
                  "Found subname_registrar for",
                  parentName,
                  ":",
                  appId
                );

                // Use payment token, symbol, and base cost from subname_registrar if available
                if (subnameRegistrarData.payment_token) {
                  setPaymentToken(Number(subnameRegistrarData.payment_token));
                  console.log(
                    "Using payment token from subname_registrar:",
                    subnameRegistrarData.payment_token
                  );
                }
                if (subnameRegistrarData.symbol) {
                  setPaymentTokenSymbol(subnameRegistrarData.symbol);
                  console.log(
                    "Using symbol from subname_registrar:",
                    subnameRegistrarData.symbol
                  );
                }
                if (subnameRegistrarData.decimals) {
                  setPaymentTokenDecimals(
                    Number(subnameRegistrarData.decimals)
                  );
                  console.log(
                    "Using decimals from subname_registrar:",
                    subnameRegistrarData.decimals
                  );
                }
                if (subnameRegistrarData.base_cost) {
                  // Store the base cost for pricing calculations
                  setSubnameRegistrarBaseCost(
                    Number(subnameRegistrarData.base_cost)
                  );
                  console.log(
                    "Found base cost from subname_registrar:",
                    subnameRegistrarData.base_cost
                  );
                }
              } else {
                // subname_registrar text record exists but no contract field
                setSubnameRegistrarAvailable(false);
                console.log(
                  "subname_registrar text record found but no contract field for",
                  parentName
                );
              }
            } else {
              // No subname_registrar text record found
              setSubnameRegistrarAvailable(false);
              console.log(
                "No subname_registrar text record found for",
                parentName
              );
            }
          } catch (error) {
            console.error(
              "Error fetching subname_registrar text record:",
              error
            );
            setSubnameRegistrarAvailable(false);
          }

          // Fallback to the original method if subname_registrar is not found
          if (appId === parentAppId) {
            console.log("Falling back to original method for", parentName);
            const ci = new CONTRACT(
              Number(797607),
              algodClient,
              indexerClient,
              { ...VNSRegistrySpec.contract, events: [] },
              {
                addr:
                  activeAccount?.address ||
                  algosdk.getApplicationAddress(797607),
                sk: new Uint8Array(),
              }
            );
            const ownerOfR = await ci.ownerOf(await namehash(parentName));
            const nodeOwner = ownerOfR.returnValue;
            const accInfo = await indexerClient
              .lookupAccountByID(nodeOwner)
              .do();
            const block = await indexerClient
              .lookupBlock(accInfo.account["created-at-round"])
              .do();
            const applicationTransaction = block.transactions.find(
              (txn: any) =>
                txn["tx-type"] === "appl" &&
                algosdk.getApplicationAddress(
                  txn["application-transaction"]["application-id"]
                ) === nodeOwner
            );
            if (!applicationTransaction) {
              console.error(
                "No application transaction found for parent name:",
                parentName
              );
              return;
            }
            appId =
              applicationTransaction["application-transaction"][
                "application-id"
              ];
            setParentAppId(appId);
          }
        }

        // Get registrar owner
        try {
          const ciRegistrar = new CONTRACT(
            appId,
            algodClient,
            indexerClient,
            { ...VNSRegistrarSpec.contract, events: [] },
            {
              addr:
                activeAccount?.address || algosdk.getApplicationAddress(appId),
              sk: new Uint8Array(),
            }
          );
          const ownerR = await ciRegistrar.get_owner();
          if (ownerR.success) {
            setRegistrarOwner(ownerR.returnValue);
            console.log("Registrar owner:", ownerR.returnValue);
          } else {
            console.error("Failed to get registrar owner for app:", appId);
          }
        } catch (error) {
          console.error("Error fetching registrar owner:", error);
        }

        // Get payment token from registrar (only if not already set from subname_registrar)
        let tokenId = paymentToken; // Use existing value if already set from subname_registrar

        if (!tokenId || tokenId === 828295) {
          // Only fetch if not set or still using default
          const ci2 = new CONTRACT(
            appId,
            algodClient,
            indexerClient,
            { ...VNSRegistrarSpec.contract, events: [] },
            {
              addr:
                activeAccount?.address || algosdk.getApplicationAddress(appId),
              sk: new Uint8Array(),
            }
          );

          const getPaymentTokenR = await ci2.get_payment_token();
          if (!getPaymentTokenR.success) {
            console.error("Failed to get payment token for app:", appId);
            return;
          }

          tokenId = Number(getPaymentTokenR.returnValue);
          setPaymentToken(tokenId);
        }

        // Get token details (only if not already set from subname_registrar)
        let arc200Decimals = paymentTokenDecimals;
        let arc200Symbol = paymentTokenSymbol;

        if (!arc200Decimals || !arc200Symbol) {
          const ciArc200 = new CONTRACT(
            tokenId,
            algodClient,
            indexerClient,
            abi.nt200,
            {
              addr:
                activeAccount?.address ||
                algosdk.getApplicationAddress(tokenId),
              sk: new Uint8Array(),
            }
          );

          if (!arc200Decimals) {
            const arc200DecimalsR = await ciArc200.arc200_decimals();
            if (!arc200DecimalsR.success) {
              console.error(
                "Failed to get payment token decimals for token:",
                tokenId
              );
              return;
            }
            arc200Decimals = Number(arc200DecimalsR.returnValue);
            setPaymentTokenDecimals(arc200Decimals);
          }

          if (!arc200Symbol) {
            const arc200SymbolR = await ciArc200.arc200_symbol();
            if (!arc200SymbolR.success) {
              console.error(
                "Failed to get payment token symbol for token:",
                tokenId
              );
              return;
            }
            arc200Symbol = arc200SymbolR.returnValue;
            setPaymentTokenSymbol(arc200Symbol);
          }
        }

        console.log("Payment token loaded:", {
          tokenId,
          symbol: arc200Symbol,
          decimals: arc200Decimals,
          parentName,
        });
      } catch (error) {
        console.error("Error loading payment token:", error);
      } finally {
        setIsLoadingPaymentToken(false);
      }
    })();
  }, [parentName, parentAppId, activeAccount?.address]);

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

          {subnameRegistrarBaseCost === 0 || !subnameRegistrarAvailable ? (
            // 404-style page when base_cost is 0
            <Paper
              sx={{
                p: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 3,
                minHeight: "400px",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h1"
                sx={{
                  fontSize: "6rem",
                  fontWeight: "bold",
                  color: "#8B5CF6",
                  opacity: 0.1,
                  lineHeight: 1,
                }}
              >
                404
              </Typography>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Domain Not Available
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: "500px", mb: 2 }}
              >
                {!subnameRegistrarAvailable
                  ? `${parentName} subname registrar is not available.`
                  : `${parentName} names are not available for registration at this time.`}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {!subnameRegistrarAvailable
                  ? "This domain does not have a configured subname registrar or the registrar is not accessible."
                  : "This domain may be temporarily unavailable or not accepting new registrations."}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate("/")}
                sx={{
                  borderColor: "#8B5CF6",
                  color: "#8B5CF6",
                  "&:hover": {
                    borderColor: "#7C3AED",
                    backgroundColor: "rgba(139, 92, 246, 0.04)",
                  },
                }}
              >
                Go Back Home
              </Button>
            </Paper>
          ) : (
            // Normal registration form
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
                      <InputAdornment position="end">
                        {parentName === "voi" ? ".voi" : `${parentName}`}
                      </InputAdornment>
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
                    {price.toLocaleString()}{" "}
                    {isLoadingPaymentToken
                      ? "..."
                      : symbolOverride(paymentTokenSymbol)}
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                      Successfully registered {name}.voi!
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      To enable GitHub URL registration, set your GitHub
                      profile's "Website/blog" field to:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        backgroundColor: "rgba(0,0,0,0.1)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        display: "inline-block",
                        mb: 1,
                      }}
                    >
                      https://envoi.sh/{name}.voi
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                    >
                      This allows the GitHub API to verify your Envoi profile
                      ownership.
                    </Typography>
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
                    {subnameRegistrarBaseCost === 0
                      ? `${parentName} names are not available for sale`
                      : isReserved
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
          )}
        </Box>

        {subnameRegistrarBaseCost !== 0 && subnameRegistrarAvailable && (
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
        )}

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
              {name}.{parentName}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Duration: {duration} year(s)
            </Typography>
            <Typography variant="body1" gutterBottom>
              Name Cost: {price.toLocaleString()} {paymentTokenSymbol}
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
              {paymentTokenSymbol === "VOI"
                ? `${calculateTotalCost().total.toLocaleString()} ${paymentTokenSymbol}`
                : `${calculateTotalCost().namePrice.toLocaleString()} ${paymentTokenSymbol} + ${calculateTotalCost().fees.toLocaleString()} VOI`}
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
