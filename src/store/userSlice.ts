import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type TimeFilter = '24h' | '7d' | 'all';

export interface UserState {
  timeFilter: TimeFilter;
  paymentMethod: string;
}

// Get the initial state from localStorage if available
const getInitialState = (): UserState => {
  try {
    const persistedState = localStorage.getItem('persist:user');
    if (persistedState) {
      const { timeFilter, paymentMethod } = JSON.parse(persistedState);
      // Remove quotes from the stored string
      const parsedTimeFilter = JSON.parse(timeFilter) as TimeFilter;
      if (parsedTimeFilter === '24h' || parsedTimeFilter === '7d' || parsedTimeFilter === 'all') {
        // Ensure paymentMethod has a valid value, default to VOI if not
        const validPaymentMethod = paymentMethod ? JSON.parse(paymentMethod) : 'VOI';
        return { 
          timeFilter: parsedTimeFilter, 
          paymentMethod: validPaymentMethod 
        };
      }
    }
  } catch (error) {
    console.error('Error reading persisted state:', error);
  }
  // Default state with VOI as payment method
  return { 
    timeFilter: '24h', 
    paymentMethod: 'VOI' 
  };
};

const userSlice = createSlice({
  name: 'user',
  initialState: getInitialState(),
  reducers: {
    setTimeFilter: (state, action: PayloadAction<TimeFilter>) => {
      state.timeFilter = action.payload;
      // Persist both timeFilter and paymentMethod
      localStorage.setItem('persist:user', JSON.stringify({
        timeFilter: JSON.stringify(action.payload),
        paymentMethod: JSON.stringify(state.paymentMethod)
      }));
    },
    setPaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethod = action.payload;
      // Persist both timeFilter and paymentMethod
      localStorage.setItem('persist:user', JSON.stringify({
        timeFilter: JSON.stringify(state.timeFilter),
        paymentMethod: JSON.stringify(action.payload)
      }));
      // Also update preferredPaymentMethod for backward compatibility
      localStorage.setItem('preferredPaymentMethod', action.payload);
    },
  },
});

export const { setTimeFilter, setPaymentMethod } = userSlice.actions;
export default userSlice.reducer; 