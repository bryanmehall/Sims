import { rootReducer, initialState, enhancers } from '../smd'
import { createStore } from 'redux'

export const createMockStore = () => (
	createStore(rootReducer, initialState, enhancers)
)
