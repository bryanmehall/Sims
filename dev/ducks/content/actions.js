const fetchSimData = (path) => ({
	type: 'FETCH_SIM_DATA',
	payload: {
		path: path
	}
})

const initializeSimState = (contentBlockData) => {
	//initialize keyframes, selector functions ...? ...here
	console.log(contentBlockData.initialState)
	return {
		type: 'INITIALIZE_SIM_STATE',
		payload: {
			simData: contentBlockData.initialState
		}
	}
}

export default {
}
