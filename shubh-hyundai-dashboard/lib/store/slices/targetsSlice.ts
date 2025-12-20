import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type CityTarget = {
  id: string
  city: string
  month: string
  labour: number
  parts: number
  totalVehicles: number
  paidService: number
  freeService: number
  rr: number
  createdBy: string
  createdAt: string
}

interface TargetsState {
  targets: CityTarget[]
}

const initialState: TargetsState = {
  targets: []
}

const targetsSlice = createSlice({
  name: 'targets',
  initialState,
  reducers: {
    addTarget: (state, action: PayloadAction<CityTarget>) => {
      state.targets = [action.payload, ...state.targets]
    },
    setTargets: (state, action: PayloadAction<CityTarget[]>) => {
      state.targets = action.payload
    },
    removeTarget: (state, action: PayloadAction<string>) => {
      state.targets = state.targets.filter((t) => t.id !== action.payload)
    },
    updateTarget: (state, action: PayloadAction<CityTarget>) => {
      const index = state.targets.findIndex((t) => t.id === action.payload.id)
      if (index !== -1) {
        state.targets[index] = action.payload
      }
    },
  },
})

export const { addTarget, setTargets, removeTarget, updateTarget } = targetsSlice.actions
export default targetsSlice.reducer
