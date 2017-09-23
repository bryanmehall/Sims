import SimActions from '../sim/actions'
//fetch content
const fetchCourseData = (courseId) => ({
	type: 'FETCH_COURSE_DATA',
	payload: {
		courseId: courseId
	}
})
const activateCourse = (courseId) => ({
	type:"ACTIVATE_COURSE",
	payload:{
		courseId
	}
})
const activateContentBlock = (courseId, partId, contentBlockId) => (
	[
		pauseOthers(courseId, partId, contentBlockId),
		{
			type: "ACTIVATE_CONTENT_BLOCK",
			payload: {
				courseId, partId, contentBlockId
			}
		}
	]
)

//initialize state
const initializeCourseState = (courseData) => {
	const parts = courseData.parts
	let initContentBlockActions = []
	const initPartsActions = parts.map((partData) => {
		partData.contentBlocks.forEach((contentBlockData)=>{
			const contentBlockAction = initializeContentBlockState(contentBlockData, courseData.id, partData.id, contentBlockData.id)
			initContentBlockActions.push(contentBlockAction)
		})
		return initializePartState(partData, courseData.id)
	})

	return [
		...initContentBlockActions, //switch to fetch ansynchronously with http2 but keep order in mind
		...initPartsActions,//this order matters because the parts need to be available for rendering
		{
			type: 'INITIALIZE_COURSE_STATE',
			payload: { courseId: courseData.id, courseData }
		}

	]
}

const initializePartState = (partData, courseId) => ({
	type: 'INITIALIZE_PART_STATE',
	payload: {
		courseId, partData
	}
})

const initializeContentBlockState = (contentBlockData, courseId, partId, contentBlockId) => ({//upgrade to http2 and fetch all asynchronously
	type: 'INITIALIZE_CONTENT_BLOCK_STATE',
	payload: {
		courseId, partId, contentBlockId, contentBlockData
	}
})

//animations


const setPlaying = (courseId, partId, contentBlockId, playing) => (
	[
		SimActions.returnToAnimation(),
		{
			type: 'ANIM_CONTENT',
			payload: {
				courseId,
				partId,
				contentBlockId,
				playing
			}
		}
	]
)
const animContentStep = (courseId, partId, contentBlockId, initTime, initAnimTime) => ({
	type: "ANIM_CONTENT_STEP",
	payload: {
		courseId,
		partId,
		contentBlockId,
		initTime,
		initAnimTime
	}
})


const setAnimLength = (courseId, partId, contentBlockId, length) => ({
	type: 'SET_ANIM_LENGTH',
	payload: {
		courseId,
		partId,
		contentBlockId,
		length
	}

})
const setAnimTime = (courseId, partId, contentBlockId, time) => ({
	type: 'SET_ANIM_TIME',
	payload: {
		courseId,
		partId,
		contentBlockId,
		time
	}
})
const pauseOthers = (courseId, partId, contentBlockId) => ({
	type: "PAUSE_OTHERS",
	payload: { courseId, partId, contentBlockId }
})

const setEditMode = (inEditMode) => ({
	type: "SET_EDIT_MODE",
	value: inEditMode
})


export default {
	initializeContentBlockState,
	initializePartState,
	setPlaying,
	fetchCourseData,
	initializeCourseState,
	activateCourse,
	activateContentBlock,
	pauseOthers,
	setAnimLength,
	animContentStep,
	setAnimTime,
	setEditMode
}
