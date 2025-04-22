import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { useSnackbar } from "notistack";
import { debounce } from "lodash";
import { RegistryService } from "@/services/registry";
import { rsvps } from "@/constants/rsvps";
import { getNamePrice } from "@/utils/price";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { ALGORAND_ZERO_ADDRESS } from "@/constants";
import { Typography } from "@mui/material";
import { Box } from "@mui/material";
import React from "react";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { getAlgorandClients } from "@/wallets";
import algosdk from "algosdk";
import { CONTRACT, abi } from "ulujs";
import { APP_SPEC as VNSRegistrarSpec } from "@/clients/VNSRegistrarClient";
import { APP_SPEC as VNSResolverSpec } from "@/clients/VNSPublicResolverClient";
import { TRANSACTION_FEES } from "@/constants/fees";

export interface PriceBreakdown {
  basePrice: number;
  duration: number;
  total: number;
  paymentAssetSymbol: string;
}

export const useNameRegistration = ({
  initialName,
  initialDuration,
}: {
  initialName?: string;
  initialDuration?: number;
}) => {
  const [name, setName] = useState(
    initialName ? initialName.split(".")[0] : ""
  );
  const [nameError, setNameError] = useState("");
  const [duration, setDuration] = useState(initialDuration ?? 1);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const { activeAccount, signTransactions } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const paymentAssetSymbol = useSelector(
    (state: RootState) => state.user.paymentMethod
  );

  // TODO fetch these from the contract
  const priceLookup: Record<string, number> = {
    VOI: 2000,
    aUSDC: 5,
    UNIT: 50,
  };

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

  const debouncedCheckAvailability = useMemo(
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

  useEffect(() => {
    return () => {
      debouncedCheckAvailability.cancel();
    };
  }, [debouncedCheckAvailability]);

  useEffect(() => {
    const basePrice = getNamePrice(name, priceLookup[paymentAssetSymbol]);
    const totalPrice = basePrice * parseInt(duration.toString());
    setPrice(totalPrice);
  }, [name, duration, paymentAssetSymbol]);

  useEffect(() => {
    debouncedCheckAvailability(name);
  }, [name, debouncedCheckAvailability]);

  const isReserved = `${name}.voi` in rsvps;
  const reservedOwner = isReserved ? rsvps[`${name}.voi`] : null;
  const isReservedOwner = activeAccount?.address === reservedOwner;

  const getPriceBreakdown = (): PriceBreakdown => {
    const basePrice = getNamePrice(name, priceLookup[paymentAssetSymbol]);
    return {
      basePrice,
      duration,
      total: price,
      paymentAssetSymbol,
    };
  };

  const getPriceBreakdownJSX = () => {
    const basePrice = getNamePrice(name, priceLookup[paymentAssetSymbol]);
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

  const handleConfirmRegisterAUSD = async () => {
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

      const aUSDC = {
        asaAssetId: 302190,
        tokenId: 395614,
        decimals: 6,
        symbol: "aUSDC",
      };

      const vns = {
        registrar: 797609,
        resolver: 797608,
      };

      const ci = new CONTRACT(
        vns.registrar,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

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
      {
        const buildN = [];

        // Deposit USDC (ASA -> ARC200)
        {
          const txnO = (await builder.arc200.deposit(price * 1e6))?.obj;
          const assetTransfer = {
            xaid: aUSDC.asaAssetId,
            aamt: price * 10 ** aUSDC.decimals,
            payment: 28500,
          };
          buildN.push({
            ...txnO,
            ...assetTransfer,
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
            await builder.registrar[`register_${aUSDC.symbol.toLowerCase()}`](
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

      const vns = {
        registrar: 797609,
        resolver: 797608,
      };

      const wVOI = {
        tokenId: 828295, // en Voi
        decimals: 6,
      };

      const builder = {
        arc200: new CONTRACT(
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

        // Deposit VOI (NET -> ARC200)
        {
          const txnO = (
            await builder.arc200.deposit(price * 10 ** wVOI.decimals)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: price * 10 ** wVOI.decimals,
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

        console.log("customR", customR);

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

  const handleConfirmRenewVOI = async () => {
    if (!activeAccount) {
      enqueueSnackbar("Please connect your wallet to renew a name", {
        variant: "error",
      });
      return;
    }

    const fullName = `${name}.voi`;

    try {
      setLoading(true);
      setError(null);
      const { algodClient, indexerClient } = getAlgorandClients();

      const ctcInfoRegistrar = 797609;
      const ctcInfoResolver = 797608;
      const ctcInfoEnVoi = 828295;

      const ci = new CONTRACT(
        ctcInfoRegistrar,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      const vns = {
        registrar: ctcInfoRegistrar,
        resolver: ctcInfoResolver,
      };

      const wVOI = {
        tokenId: ctcInfoEnVoi,
        decimals: 6,
      };

      const builder = {
        arc200: new CONTRACT(
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
      };

      let customR;
      for (const p0 of [0, 28500]) {
        const buildN = [];

        // Create wVOI Balance for user if needed
        if (p0 > 0) {
          const txnO = (
            await builder.arc200.createBalanceBox(activeAccount.address)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: p0,
            note: new TextEncoder().encode(
              `envoi createBalanceBox ${price} ${paymentAssetSymbol} for ${name}.voi renewal`
            ),
          });
        }

        // Deposit VOI (NET -> ARC200)
        {
          const txnO = (
            await builder.arc200.deposit(price * 10 ** wVOI.decimals)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: price * 10 ** wVOI.decimals,
            note: new TextEncoder().encode(
              `envoi deposit ${price} ${paymentAssetSymbol} for ${name}.voi renewal`
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
              `envoi arc200_approve ${price} ${paymentAssetSymbol} spending for ${name}.voi renewal`
            ),
          });
        }

        // Renew name
        {
          const paramDuration = Number(duration) * 365 * 24 * 60 * 60; // Convert years to seconds
          const txnO = (
            await builder.registrar.renew(
              stringToUint8Array(name, 32),
              paramDuration
            )
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 336700,
            note: new TextEncoder().encode(
              `envoi registrar renew ${name}.voi for ${duration} years`
            ),
          });
        }

        ci.setFee(15000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);

        customR = await ci.custom();
        console.log("customR", customR, buildN);

        if (customR.success) {
          break;
        }
      }

      if (!customR.success) {
        throw new Error("Failed to renew name");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      setSuccess(true);
      enqueueSnackbar("Name renewed successfully!", {
        variant: "success",
      });
      setShowConfirmation(false);
    } catch (err) {
      console.error("Error renewing name:", err);
      setError(err instanceof Error ? err.message : "Failed to renew name");
      enqueueSnackbar("Failed to renew name. Please try again.", {
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
  return {
    // State
    name,
    nameError,
    duration,
    loading,
    price,
    showConfirmation,
    termsAccepted,
    error,
    success,
    showTermsModal,
    isAvailable,
    isChecking,
    isReserved,
    reservedOwner,
    isReservedOwner,
    paymentAssetSymbol,

    // Setters
    setName,
    setDuration,
    setLoading,
    setPrice,
    setShowConfirmation,
    setTermsAccepted,
    setError,
    setSuccess,
    setShowTermsModal,

    // Handlers
    handleNameChange,
    getPriceBreakdown,
    calculateTotalCost,
    handleConfirmRegisterUNIT,
    handleConfirmRegisterAUSD,
    handleConfirmRegisterVOI,
    handleConfirmRenewVOI,
    handleConfirmRegister,

    // JSX
    getPriceBreakdownJSX,

    // Wallet
    activeAccount,
    signTransactions,
    enqueueSnackbar,
  };
};
