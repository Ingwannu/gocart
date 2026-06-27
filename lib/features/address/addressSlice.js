import { createSlice } from '@reduxjs/toolkit'

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [],
    },
    reducers: {
        setAddresses: (state, action) => {
            state.list = action.payload
        },
        addAddress: (state, action) => {
            state.list.push(action.payload)
        },
        updateAddress: (state, action) => {
            state.list = state.list.map((address) =>
                address.id === action.payload.id ? action.payload : address
            )
        },
        removeAddress: (state, action) => {
            state.list = state.list.filter((address) => address.id !== action.payload)
        },
    }
})

export const { setAddresses, addAddress, updateAddress, removeAddress } = addressSlice.actions

export default addressSlice.reducer
