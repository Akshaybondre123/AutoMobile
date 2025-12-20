import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type UserRole = "owner" | "general_manager" | "service_manager" | "service_advisor" | "body_shop_manager" | "gm_service"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  city?: string
  org_id?: string
  showroom_id?: string
  showroom_city?: string
}

interface AuthState {
  user: User | null
  token: string | null
}

const initialState: AuthState = {
  user: null,
  token: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload
    },
    login: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
    },
    logout: (state) => {
      state.user = null
      state.token = null
    },
  },
})

export const { setUser, setToken, login, logout } = authSlice.actions
export default authSlice.reducer
