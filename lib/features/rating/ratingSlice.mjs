import { createSlice } from "@reduxjs/toolkit";

const ratingSlice = createSlice({
	name: "rating",
	initialState: {
		ratings: [],
	},
	reducers: {
		setRatings: (state, action) => {
			state.ratings = action.payload;
		},
		addRating: (state, action) => {
			const nextRating = action.payload;
			const existingIndex = state.ratings.findIndex(
				(rating) =>
					rating.orderId === nextRating.orderId &&
					rating.productId === nextRating.productId,
			);
			if (existingIndex >= 0) {
				state.ratings[existingIndex] = nextRating;
			} else {
				state.ratings.push(nextRating);
			}
		},
	},
});

export const { setRatings, addRating } = ratingSlice.actions;

export default ratingSlice.reducer;
