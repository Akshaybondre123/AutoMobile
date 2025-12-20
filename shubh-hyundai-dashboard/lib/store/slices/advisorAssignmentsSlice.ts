import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type AdvisorAssignment = {
  id: string
  advisorName: string
  city: string
  month: string
  labour: number
  parts: number
  totalVehicles: number
  paidService: number
  freeService: number
  rr: number
  achieved: {
    labour: number
    parts: number
    totalVehicles: number
    paidService: number
    freeService: number
    rr: number
  }
  createdAt: string
}

interface AdvisorAssignmentsState {
  assignments: AdvisorAssignment[]
}

const initialState: AdvisorAssignmentsState = {
  assignments: []
}

const advisorAssignmentsSlice = createSlice({
  name: 'advisorAssignments',
  initialState,
  reducers: {
    setAssignments: (state, action: PayloadAction<AdvisorAssignment[]>) => {
      state.assignments = action.payload
    },
    addAssignment: (state, action: PayloadAction<AdvisorAssignment>) => {
      // Remove existing assignment for the same advisor, city, and month
      state.assignments = state.assignments.filter(
        (a) => !(
          a.advisorName === action.payload.advisorName &&
          a.city === action.payload.city &&
          a.month === action.payload.month
        )
      )
      state.assignments.push(action.payload)
    },
    removeAssignment: (state, action: PayloadAction<string>) => {
      state.assignments = state.assignments.filter((a) => a.id !== action.payload)
    },
    updateAssignment: (state, action: PayloadAction<AdvisorAssignment>) => {
      const index = state.assignments.findIndex((a) => a.id === action.payload.id)
      if (index !== -1) {
        state.assignments[index] = action.payload
      }
    },
    updateAssignmentAchieved: (
      state,
      action: PayloadAction<{ id: string; achieved: AdvisorAssignment['achieved'] }>
    ) => {
      const index = state.assignments.findIndex((a) => a.id === action.payload.id)
      if (index !== -1) {
        state.assignments[index].achieved = action.payload.achieved
      }
    },
  },
})

export const {
  setAssignments,
  addAssignment,
  removeAssignment,
  updateAssignment,
  updateAssignmentAchieved,
} = advisorAssignmentsSlice.actions
export default advisorAssignmentsSlice.reducer
