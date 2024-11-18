import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import styled from "styled-components";
import PieChart from "@mui/icons-material/PieChart";
import GroupIcon from "@mui/icons-material/Group";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EngineeringIcon from "@mui/icons-material/Engineering";
import { List, ListItem, ListItemIcon, ListItemText } from "@mui/material";

const StyledDialog = styled(Dialog)<{ $isDarkTheme: boolean }>`
  .MuiDialog-paper {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)"};
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    border-radius: 24px;
    padding: 16px;
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  }
`;

const Section = styled(Box)<{ $isDarkTheme: boolean }>`
  margin-bottom: 24px;

  h6 {
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    margin-bottom: 8px;
    font-weight: 600;
  }

  p {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    margin-bottom: 16px;
    line-height: 1.6;
  }
`;

const PercentageBox = styled(Box)<{ $isDarkTheme: boolean }>`
  display: inline-block;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(144, 202, 249, 0.2)" : "rgba(25, 118, 210, 0.1)"};
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
  font-weight: 600;
`;

interface RewardDistributionModalProps {
  open: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
}

const RewardDistributionModal: React.FC<RewardDistributionModalProps> = ({
  open,
  onClose,
  isDarkTheme,
}) => {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      $isDarkTheme={isDarkTheme}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PieChart sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Reward Distribution
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Section $isDarkTheme={isDarkTheme}>
          <Typography paragraph>
            Block rewards from the Community Chest participation node are distributed as follows:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <EmojiEventsIcon
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Weekly Draw Winner
                    <PercentageBox $isDarkTheme={isDarkTheme}>45%</PercentageBox>
                  </Box>
                }
                secondary="Allocated to a single lottery winner, selected after each epoch"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <GroupIcon sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    CCV Holders
                    <PercentageBox $isDarkTheme={isDarkTheme}>30%</PercentageBox>
                  </Box>
                }
                secondary="Distributed to all CCV holders proportional to their holdings"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <AccountBalanceIcon
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Team
                    <PercentageBox $isDarkTheme={isDarkTheme}>15%</PercentageBox>
                  </Box>
                }
                secondary="Reserved for development and maintenance"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <EngineeringIcon
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Node Operator
                    <PercentageBox $isDarkTheme={isDarkTheme}>10%</PercentageBox>
                  </Box>
                }
                secondary="For maintaining and operating the participation node"
              />
            </ListItem>
          </List>

          <Typography variant="body2" sx={{ mt: 2, fontStyle: "italic" }}>
            Note: Rewards are calculated at the end of each epoch and distributed in the following epoch.
          </Typography>
        </Section>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            color: isDarkTheme ? "#90caf9" : "#1976d2",
          }}
        >
          Close
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default RewardDistributionModal; 