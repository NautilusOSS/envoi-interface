export interface StakingContract {
  appId: number;
  name: string;
  balance: number;
  stakedAmount: number;
  rewardsAvailable: number;
  contractAddress: string;
} 