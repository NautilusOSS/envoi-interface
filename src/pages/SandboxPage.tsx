import React, { useState } from "react";
import {
  Button,
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Stack,
  useTheme as useMuiTheme,
} from "@mui/material";
import { useTheme } from "@/contexts/ThemeContext";
import { CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SandboxPage: React.FC = () => {
  const { activeAccount } = useWallet();
  const { mode, toggleMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [inputName, setInputName] = useState("");

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const renderButtons = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Buttons
      </Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="primary">
          Primary
        </Button>
        <Button variant="outlined" color="primary">
          Secondary
        </Button>
        <Button variant="text">Text</Button>
        <Button variant="contained" onClick={toggleMode}>
          Toggle {mode === 'light' ? 'Dark' : 'Light'} Mode
        </Button>
      </Stack>
    </Paper>
  );

  const renderTypography = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Typography
      </Typography>
      <Stack spacing={2}>
        <Typography variant="h1">Heading 1</Typography>
        <Typography variant="h2">Heading 2</Typography>
        <Typography variant="body1">
          Body 1. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </Typography>
        <Typography variant="body2">
          Body 2. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </Typography>
      </Stack>
    </Paper>
  );

  const renderColors = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Theme Colors
      </Typography>
      <Stack direction="row" spacing={2}>
        <Box
          sx={{
            width: 100,
            height: 100,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
          }}
        >
          <Typography sx={{ color: 'white' }}>Primary</Typography>
        </Box>
        <Box
          sx={{
            width: 100,
            height: 100,
            bgcolor: 'secondary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
          }}
        >
          <Typography sx={{ color: 'white' }}>Secondary</Typography>
        </Box>
      </Stack>
    </Paper>
  );

  const renderReverseRegistrar = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Reverse Registrar
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="Address"
          placeholder="Enter address to lookup"
          sx={{ maxWidth: 400 }}
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={async () => {
            const { algodClient, indexerClient } = getAlgorandClients();
            const spec = {
              name: "vnsReverseRegistrar",
              desc: "",
              methods: [
                {
                  name: "check_name",
                  args: [{ type: "byte[32]", name: "name" }],
                  returns: { type: "bool" },
                },
                {
                  name: "register",
                  args: [
                    { type: "byte[32]", name: "name" },
                    { type: "address", name: "owner" },
                    { type: "uint256", name: "duration" },
                  ],
                  readonly: false,
                  returns: { type: "byte[32]" },
                  desc: "Register a new name",
                },
              ],
              events: [],
            };
            const ci = new CONTRACT(797610, algodClient, indexerClient, spec, {
              addr: activeAccount?.address || "",
              sk: new Uint8Array(),
            });

            try {
              const checkNameR = await ci.check_name(
                algosdk.decodeAddress(inputName).publicKey
              );
              console.log(checkNameR);
            } catch (error) {
              console.error("Error checking name:", error);
            }
          }}
        >
          Lookup
        </Button>
      </Stack>
      <Box sx={{ mt: 2 }}>
        <Typography>Result will appear here</Typography>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ p: 4, display: 'flex' }}>
      <Box sx={{ 
        borderRight: 1, 
        borderColor: 'divider',
        minWidth: 200,
        mr: 4
      }}>
        <Tabs 
          orientation="vertical"
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              alignItems: 'flex-start',
              textAlign: 'left',
              justifyContent: 'flex-start',
              px: 3
            }
          }}
        >
          <Tab label="Buttons" />
          <Tab label="Typography" />
          <Tab label="Colors" />
          <Tab label="Reverse Registrar" />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom>
          UI Sandbox
        </Typography>
        
        <TabPanel value={selectedTab} index={0}>
          {renderButtons()}
        </TabPanel>
        <TabPanel value={selectedTab} index={1}>
          {renderTypography()}
        </TabPanel>
        <TabPanel value={selectedTab} index={2}>
          {renderColors()}
        </TabPanel>
        <TabPanel value={selectedTab} index={3}>
          {renderReverseRegistrar()}
        </TabPanel>
      </Box>
    </Box>
  );
};

export default SandboxPage;
