import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

export interface AuthState {
  isLoggedIn: boolean;
  user: string | null;
  role: "ADMIN" | "USER" | null;
}

const initialState: AuthState = {
  isLoggedIn: false,
  user: null,
  role: null,
};

const authSlice = createSlice({
  name: "dam",
  initialState,
  reducers: {
    loginUser: (
      state,
      action: PayloadAction<{ user: string; role: "ADMIN" | "USER" }>,
    ) => {
      state.isLoggedIn = true;
      state.user = action.payload.user;
      state.role = action.payload.role;
    },
    logoutUser: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      state.role = null;
    },
    setAuthState: (state, action: PayloadAction<AuthState>) => {
      state.isLoggedIn = action.payload.isLoggedIn;
      state.user = action.payload.user;
      state.role = action.payload.role;
    },
  },
});

export const { loginUser, logoutUser, setAuthState } = authSlice.actions;
export default authSlice.reducer;
