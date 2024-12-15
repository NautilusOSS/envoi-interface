import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Container, Paper, Alert, CircularProgress, Tooltip, IconButton, InputAdornment } from '@mui/material';
import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useParams } from 'react-router-dom';

const RegisterName: React.FC = () => {
  const { name: initialName } = useParams<{ name: string }>();
  const [name, setName] = useState(initialName || '');
  const [duration, setDuration] = useState('1');
  const [loading, setLoading] = useState(false);
  const { activeAccount } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  const handleRegister = async () => {
    try {
      setLoading(true);
      // TODO: Implement name registration logic using VNS contract
      console.log('Registering:', name, 'for', duration, 'years');
      
      enqueueSnackbar('Name registered successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error registering name:', error);
      enqueueSnackbar('Failed to register name. Please try again.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Register VOI Name
        </Typography>

        {!activeAccount && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please connect your wallet to register a name
          </Alert>
        )}
        
        <Paper 
          sx={{ 
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: 'sm',
            mx: 'auto'
          }}
        >
          <TextField
            label="Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name to register"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">.voi</InputAdornment>,
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Duration (years)"
              type="number"
              variant="outlined"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              inputProps={{ min: "1", max: "10" }}
              fullWidth
            />
            <Tooltip title="Registration fee is 1000 VOI per year" arrow>
              <IconButton size="small">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Button 
            variant="contained" 
            onClick={handleRegister}
            disabled={!activeAccount || loading}
            fullWidth
            sx={{ mt: 2 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Register'
            )}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterName; 