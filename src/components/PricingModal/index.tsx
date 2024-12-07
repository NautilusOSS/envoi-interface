import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

const pricingData = [
  { length: '1 character', price: '50,000 VOI' },
  { length: '2 characters', price: '30,000 VOI' },
  { length: '3 characters', price: '20,000 VOI' },
  { length: '4 characters', price: '10,000 VOI' },
  { length: '5 characters', price: '5,000 VOI' },
  { length: '6 characters', price: '2,000 VOI' },
  { length: '7+ characters', price: '1,000 VOI' },
];

const PricingModal: React.FC<PricingModalProps> = ({ open, onClose }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Name Pricing</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name Length</TableCell>
                <TableCell align="right">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pricingData.map((row) => (
                <TableRow key={row.length}>
                  <TableCell component="th" scope="row">
                    {row.length}
                  </TableCell>
                  <TableCell align="right">{row.price}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Prices are fixed and based on name length. Shorter names have higher prices due to their scarcity.
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export const PricingInfo: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <IconButton 
        onClick={() => setOpen(true)}
        size="small"
        sx={{ 
          color: 'text.secondary',
          '&:hover': {
            color: '#8B5CF6'
          }
        }}
      >
        <InfoIcon fontSize="small" />
      </IconButton>
      <PricingModal 
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default PricingModal; 