import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTheme } from "../contexts/ThemeContext";
import MyNamesModal from "./MyNamesModal";
import { CONTRACT, abi } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { useWallet } from "@txnlab/use-wallet-react";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { APP_SPEC as VNSCollectionRegistrarSpec } from "@/clients/CollectionRegistrarClient";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import {
  bigIntToUint8Array,
  namehash,
  stringToUint8Array,
} from "@/utils/namehash";
import { zeroAddress } from "@/contants/accounts";

interface FirstToken {
  contractId: number;
  tokenId: string;
  owner: string;
  metadataURI: string;
  metadata: string;
  approved: string;
}

interface Collection {
  contractId: number;
  totalSupply: number;
  isBlacklisted: number;
  creator: string;
  mintRound: number;
  burnedSupply: number;
  firstToken: FirstToken;
}

interface CollectionsModalProps {
  open: boolean;
  onClose: () => void;
}

const CollectionsModal: React.FC<CollectionsModalProps> = ({
  open,
  onClose,
}) => {
  const { activeAccount, signTransactions } = useWallet();
  const { mode } = useTheme();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [setNameModalOpen, setSetNameModalOpen] = useState(false);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/collections?creator=BRB3JP4LIW5Q755FJCGVAOA4W3THJ7BR3K6F26EVCGMETLEAZOQRHHJNLQ"
          //"https://mainnet-idx.nautilus.sh/nft-indexer/v1/collections?creator=DORKHJKTKPZPV2ZLS45X4P6FV7VLE7QZQ7RZCN3DNRKXB56K22LX4RTXDI"
          //"https://mainnet-idx.nautilus.sh/nft-indexer/v1/collections?creator=DQVAPFLH3ZOG3LJPFCDATKKTO5YXM77ENZBAEO5LPL7AO6QASBEEKDVS4I"
        );
        const data = await response.json();
        //const filtered = data.collections.filter((c) => c.totalSupply > 0);
        setCollections(data.collections);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch collections");
        setLoading(false);
      }
    };

    if (open) {
      fetchCollections();
      setCurrentPage(0); // Reset to first page when modal opens
    }
  }, [open]);

  console.log({ collections });

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, collections.length - 1));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const currentCollection = collections[currentPage];

  const getMetadata = (collection: Collection) => {
    try {
      return JSON.parse(collection.firstToken.metadata);
    } catch {
      return null;
    }
  };

  const cleanName = (name: string) => {
    // First remove any trailing numbers
    const withoutNumbers = name.replace(/\s*\d+$/, "").trim();

    // If name contains dots, only show the last segment with a leading dot
    if (withoutNumbers.includes(".")) {
      return "." + withoutNumbers.split(".").pop();
    }

    return withoutNumbers;
  };

  const handleSetNameClick = () => {
    setSetNameModalOpen(true);
  };

  const handleSetName = async (name: string) => {
    if (!activeAccount) return;
    // if reverse collection not registered
    //   register reverse collection
    // set name for reverse collection
    const vns = {
      registry: 797607,
      resolver: 797608,
      registrar: 797609,
      reverseRegistrar: 797610,
      collectionRegistrar: 846601,
    };
    const { algodClient } = getAlgorandClients();
    const ci = new CONTRACT(
      vns.collectionRegistrar,
      algodClient,
      undefined,
      abi.custom,
      {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      }
    );
    const ciRegistry = new CONTRACT(
      vns.registry,
      algodClient,
      undefined,
      {
        name: "Registry",
        description: "Registry",
        methods: VNSRegistrySpec.contract.methods,
        events: [],
      },
      {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      }
    );
    // other cis
    const builder = {
      collectionRegistrar: new CONTRACT(
        vns.collectionRegistrar,
        algodClient,
        undefined,
        {
          name: "Collection Registrar",
          description: "Collection Registrar",
          methods: VNSCollectionRegistrarSpec.contract.methods,
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
        undefined,
        {
          name: "Resolver",
          description: "Resolver",
          methods: VNSPublicResolverSpec.contract.methods,
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
    // do register if contractId.collection.reverse owner is zero address
    const ownerOfR = await ciRegistry.ownerOf(
      await namehash(`${currentCollection.contractId}.collection.reverse`)
    );
    if (!ownerOfR.success) {
      throw new Error("Reverse collection not registered");
    }
    const ownerOf = ownerOfR.returnValue;

    const doRegister = ownerOf == zeroAddress;

    const buildN = [];
    if (doRegister) {
      const txnO = (
        await builder.collectionRegistrar.register(
          bigIntToUint8Array(BigInt(currentCollection.contractId)),
          activeAccount.address,
          0
        )
      )?.obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode(
          `collectionRegistrar register for ${currentCollection.contractId}.collection.reverse`
        ),
      });
    }
    {
      const txnO = (
        await builder.resolver.setName(
          await namehash(`${currentCollection.contractId}.collection.reverse`),
          stringToUint8Array(name, 256)
        )
      )?.obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode(
          `resolver setName for ${currentCollection.contractId}.collection.reverse to ${name}`
        ),
      });
    }
    ci.setFee(2000);
    ci.setEnableGroupResourceSharing(true);
    ci.setExtraTxns(buildN);
    const customR = await ci.custom();
    if (!customR.success) {
      throw new Error("Failed to set name");
    }
    const stxns = await signTransactions(
      customR.txns.map((t: string) => new Uint8Array(Buffer.from(t, "base64")))
    );
    const res = await algodClient
      .sendRawTransaction(stxns as Uint8Array[])
      .do();
    console.log({ res });
  };

  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "";

    // Handle IPFS URLs
    if (imageUrl.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${imageUrl.replace("ipfs://", "")}`;
    }

    return imageUrl;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            backgroundColor: "background.paper",
            maxWidth: "600px",
            width: "100%",
            borderRadius: "12px",
          },
        }}
      >
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            My Collections
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress sx={{ color: "#8B5CF6" }} />
            </Box>
          ) : error ? (
            <Typography color="error" sx={{ mb: 3 }}>
              {error}
            </Typography>
          ) : collections.length === 0 ? (
            <Typography sx={{ color: "text.secondary", mb: 3 }}>
              No active collections found.
            </Typography>
          ) : (
            <>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "300px",
                  mb: 2,
                  borderRadius: "12px",
                  overflow: "hidden",
                  backgroundColor: mode === "light" ? "#e2e8f0" : "#1e293b",
                  "&:hover .hover-overlay": {
                    opacity: 1,
                  },
                }}
              >
                {getMetadata(currentCollection)?.image && (
                  <img
                    src={getImageUrl(getMetadata(currentCollection)?.image)}
                    alt={
                      getMetadata(currentCollection)?.name || "Collection image"
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    loading="lazy"
                  />
                )}

                {/* Hover Overlay */}
                <Box
                  className="hover-overlay"
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.2s ease-in-out",
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={handleSetNameClick}
                    sx={{
                      backgroundColor: "#8B5CF6",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#7C3AED",
                      },
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      padding: "8px 24px",
                      borderRadius: "6px",
                    }}
                  >
                    Set Name
                  </Button>
                </Box>

                {/* Name Overlay */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
                    padding: "20px",
                    paddingTop: "40px",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: "white",
                      fontWeight: 600,
                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    {getMetadata(currentCollection)?.name
                      ? cleanName(getMetadata(currentCollection).name)
                      : `#${currentCollection.contractId}`}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 2,
                  mb: 2,
                }}
              >
                <IconButton
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  sx={{
                    color: "#8B5CF6",
                    "&.Mui-disabled": {
                      color:
                        mode === "light"
                          ? "rgba(0, 0, 0, 0.26)"
                          : "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography sx={{ color: "text.secondary" }}>
                  {currentPage + 1} of {collections.length}
                </Typography>
                <IconButton
                  onClick={handleNextPage}
                  disabled={currentPage === collections.length - 1}
                  sx={{
                    color: "#8B5CF6",
                    "&.Mui-disabled": {
                      color:
                        mode === "light"
                          ? "rgba(0, 0, 0, 0.26)"
                          : "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </>
          )}

          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}
          >
            <Button
              onClick={onClose}
              variant="contained"
              sx={{
                backgroundColor: "#8B5CF6",
                color: "white",
                "&:hover": {
                  backgroundColor: "#7C3AED",
                },
              }}
            >
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/*<SetNameModal
        open={setNameModalOpen}
        onClose={() => setSetNameModalOpen(false)}
        contractId={currentCollection?.contractId}
      />*/}
      <MyNamesModal
        open={setNameModalOpen}
        onClose={() => setSetNameModalOpen(false)}
        mode="setName"
        setName={handleSetName}
        onNameSet={() => {
          setSetNameModalOpen(false);
        }}
      />
    </>
  );
};

export default CollectionsModal;
