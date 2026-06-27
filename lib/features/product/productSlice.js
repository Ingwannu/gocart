import { createSlice } from '@reduxjs/toolkit'
import { upsertPublicProduct } from '@/lib/product-list.mjs'

const productSlice = createSlice({
    name: 'product',
    initialState: {
        list: [],
    },
    reducers: {
        setProduct: (state, action) => {
            state.list = action.payload
        },
        upsertProduct: (state, action) => {
            state.list = upsertPublicProduct(state.list, action.payload)
        },
        clearProduct: (state) => {
            state.list = []
        }
    }
})

export const { setProduct, upsertProduct, clearProduct } = productSlice.actions

export default productSlice.reducer
