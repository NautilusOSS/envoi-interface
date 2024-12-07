import React from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';

interface NetworkSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedNetwork: 'mainnet' | 'testnet';
  onNetworkChange: (network: 'mainnet' | 'testnet') => void;
}

const NETWORK_CONFIG = {
  mainnet: {
    indexerUrl: 'https://mainnet-idx.voi.nodely.dev',
    algodUrl: 'https://mainnet-api.voi.nodely.dev'
  },
  testnet: {
    indexerUrl: 'https://testnet-idx.voi.nodely.dev',
    algodUrl: 'https://testnet-api.voi.nodely.dev'
  }
} as const;

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  open,
  onClose,
  selectedNetwork,
  onNetworkChange,
}) => {
  const handleNetworkSelect = (network: 'mainnet' | 'testnet') => {
    onNetworkChange(network);
    onClose();
  };

  const NetworkDetails = ({ network }: { network: 'mainnet' | 'testnet' }) => (
    <Box sx={{ mt: 1 }}>
      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 0.5 }}>
        Indexer API:
      </Typography>
      <Typography sx={{ 
        fontSize: '0.75rem', 
        color: '#374151',
        bgcolor: '#F3F4F6',
        p: 1,
        borderRadius: 1,
        fontFamily: 'monospace',
        wordBreak: 'break-all'
      }}>
        {NETWORK_CONFIG[network].indexerUrl}
      </Typography>
      
      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mt: 1, mb: 0.5 }}>
        Algod API:
      </Typography>
      <Typography sx={{ 
        fontSize: '0.75rem', 
        color: '#374151',
        bgcolor: '#F3F4F6',
        p: 1,
        borderRadius: 1,
        fontFamily: 'monospace',
        wordBreak: 'break-all'
      }}>
        {NETWORK_CONFIG[network].algodUrl}
      </Typography>
    </Box>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="network-modal-title"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 24,
        p: 3,
      }}>
        <Typography
          id="network-modal-title"
          variant="h6"
          sx={{
            mb: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        >
          Select Network
        </Typography>
        
        <Stack spacing={2}>
          <Box
            onClick={() => handleNetworkSelect('mainnet')}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: selectedNetwork === 'mainnet' ? '#8B5CF6' : '#E5E7EB',
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#8B5CF6',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Radio 
                checked={selectedNetwork === 'mainnet'}
                sx={{
                  '&.Mui-checked': {
                    color: '#8B5CF6',
                  },
                }}
              />
              <Box>
                <Typography sx={{ fontWeight: 500 }}>Voi Mainnet</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  Production Network
                </Typography>
              </Box>
            </Box>
            <NetworkDetails network="mainnet" />
          </Box>

          <Box
            onClick={() => handleNetworkSelect('testnet')}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: selectedNetwork === 'testnet' ? '#8B5CF6' : '#E5E7EB',
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#8B5CF6',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Radio 
                checked={selectedNetwork === 'testnet'}
                sx={{
                  '&.Mui-checked': {
                    color: '#8B5CF6',
                  },
                }}
              />
              <Box>
                <Typography sx={{ fontWeight: 500 }}>Voi Testnet</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  Development Network
                </Typography>
              </Box>
            </Box>
            <NetworkDetails network="testnet" />
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}; 