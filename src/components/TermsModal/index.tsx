import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Box,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ open, onClose }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Terms of Service</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Reservation Process
          </Typography>
          <Typography variant="body2" paragraph>
            Names are reserved until the official launch of the service, at which point they will be automatically airdropped to their respective owners.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Withdrawal Rights
          </Typography>
          <Typography variant="body2" paragraph>
            You may withdraw your reservation and receive a full refund at any time before the service launch.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="warning.main">
            Ownership Disclaimer
          </Typography>
          <Typography variant="body2" paragraph>
            Reserving a name does not guarantee ownership. Reservations may be subject to appeal in cases of trademark violations or abuse.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Refund Policy
          </Typography>
          <Typography variant="body2" paragraph>
            If a reservation is cancelled due to a successful appeal, your funds will be automatically returned.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Renewal Requirements
          </Typography>
          <Typography variant="body2" paragraph>
            After the service launch, names must be renewed before the end of their grace period to maintain ownership.
          </Typography>
        </Box>

        <Box sx={{ 
          mt: 4, 
          p: 2, 
          bgcolor: 'rgba(139, 92, 246, 0.05)', 
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'rgba(139, 92, 246, 0.1)'
        }}>
          <Typography variant="body2" color="text.secondary">
            By proceeding with a reservation, you acknowledge and agree to all terms outlined above. These terms are designed to create a fair and secure naming system for all users.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TermsModal; 