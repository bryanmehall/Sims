const defaultContent = {
	activeCourse: null,
	activePart: null,
	activeContentBlock :null,
	courses: [],
	parts: [],
	contentBlocks: []
}
const contentReducer = (state = defaultContent, action) => {
	//here state refers to content section of tree
	switch (action.type) {
		case "HOME": {
			const active = {
				activeCourse: null,
				activePart: null,
				activeContentBlock: null
			}
			return Object.assign({}, state, active)
		}
		case "ACTIVATE_COURSE": {
			const active = {
				activeCourse: action.payload.courseId,
				activePart: null,
				activeContentBlock: null
			}
			return Object.assign({}, state, active)
		}
		case "ACTIVATE_PART": {
			const active = {
				activeCourse: action.payload.courseId,
				activePart: action.payload.partId,
				activeContentBlock: null
			}

			return Object.assign({}, state, active)
		}
		case "ACTIVATE_CONTENT_BLOCK": {
			const id = (action.payload.contentBlockId === "frequency") ? "introduction" : action.payload.contentBlockId
			const active = {
				activeCourse: action.payload.courseId,
				activePart: action.payload.partId,
				activeContentBlock: id
			}

			return Object.assign({}, state, active)
		}
		case "FETCH_COURSE_DATA":
		case "INITIALIZE_COURSE_STATE": { //route above to course reducer
			const index = state.courses.findIndex(
				(courseData) => (
					courseData.courseId === action.payload.courseId
				)
			)
			const pos = index === -1 ? state.courses.length : index //handle if element does not exist
			const updatedCourse = courseReducer(state.courses[pos], action)
			const newCourseList = Object.assign([], state.courses, { [pos]: updatedCourse })
			return Object.assign({}, state, { courses: newCourseList })
		}
		case "FETCH_PART_DATA":
		case "INITIALIZE_PART_STATE": {
			const index = state.parts.findIndex(
				(partData) => (
					partData.courseId === action.payload.courseId && partData.partId === action.payload.partId
				)
			)
			const pos = index === -1 ? state.parts.length : index
			const updatedPart = partReducer(state.parts[pos], action)
			const newPartList = Object.assign([], state.parts, { [pos]: updatedPart })
			return Object.assign({}, state, { parts: newPartList })
		}
		case "PAUSE_OTHERS": {
			const contentBlocks = state.contentBlocks
			const paused = contentBlocks.map((contentBlockData) => {
				if (contentBlockData.type === 'anim'){
					const active = contentBlockData.courseId === action.payload.courseId &&
						  contentBlockData.partId === action.payload.partId &&
						  contentBlockData.contentBlockId === action.payload.contentBlockId
					const playing = active ? contentBlockData.anim.playing : false
					const newAnim = Object.assign({}, contentBlockData.anim, { playing })
					return Object.assign({}, contentBlockData, { anim: newAnim })
				} else {
					return contentBlockData
				}
			})
			return Object.assign({}, state, { contentBlocks: paused })
		}
		case "INITIALIZE_CONTENT_BLOCK_STATE":
		case "ANIM_CONTENT":
		case "SET_ANIM_LENGTH":
		case "SET_ANIM_TIME":
		case "ANIM_CONTENT_STEP": {
			const index = state.contentBlocks.findIndex(
				(contentBlockData) => {
					return contentBlockData.courseId === action.payload.courseId &&
					contentBlockData.partId === action.payload.partId &&
					contentBlockData.contentBlockId == action.payload.contentBlockId
				}
			)
			const pos = index === -1 ? state.contentBlocks.length : index
			const updatedContentBlock = contentBlockReducer(state.contentBlocks[pos], action)
			const newContentBlockList = Object.assign([], state.contentBlocks, { [pos]: updatedContentBlock })
			return Object.assign({}, state, { contentBlocks: newContentBlockList })
		}
		default:
			return state //Object.assign({}, state, partsReducer(state.parts, action))
	}
}

const courseReducer = (state, action) => {//here state refers to a single course meta block
	switch (action.type) {
		case "FETCH_COURSE_DATA": {
			return {
				courseId: action.payload.courseId,
				loading:true
			}
		}
		case "INITIALIZE_COURSE_STATE": {
			const courseData = action.payload.courseData
			const courseMetaData = {
				loading: false,
				title: courseData.title,
				description:courseData.description,
				parts: courseData.parts.map((partData) => (partData.id))
			}
			return Object.assign({}, state, courseMetaData)
		}
		default: {
			return state
		}
	}
}

const partReducer = (state = [], action) => {
	switch (action.type){
		case 'INITIALIZE_PART_STATE':
			const partData = action.payload.partData
			const partMetaData = {
				courseId:action.payload.courseId,
				partId: partData.id,
				title: partData.title,
				contentBlocks:partData.contentBlocks.map((contentBlockData)=>(contentBlockData.id)),
			}
			return Object.assign({}, state, partMetaData)
		default:
			return state
	}
}

const contentBlockReducer = (state={} , action) => {
	switch (action.type){
		case "INITIALIZE_CONTENT_BLOCK_STATE": {
			const contentBlockData = action.payload.contentBlockData
			const type = contentBlockData.type
			let contentMetaData = {
				courseId: action.payload.courseId,
				partId: action.payload.partId,
				contentBlockId: action.payload.contentBlockId,
				title: contentBlockData.title,
				type: type,
				text: contentBlockData.text
			}
			if (type ==='anim'){
				contentMetaData.anim = {
					playing: false,
					length: contentBlockData.length,
					time: 0
				}
			}
			return Object.assign({}, state, contentMetaData)
		}
		case "ANIM_CONTENT": {
			const playing = action.payload.playing
			const newAnimState = Object.assign({}, state.anim, { playing: playing })
			return Object.assign({}, state, { anim: newAnimState })
		} case "SET_ANIM_LENGTH": {
			const length = action.payload.length
			const newAnimState = Object.assign({}, state.anim, {length:length})
			return Object.assign({}, state, { anim: newAnimState })
		}
		case "SET_ANIM_TIME": {
			const time = action.payload.time

			const newAnimState = Object.assign({}, state.anim, {time:time})
			return Object.assign({}, state, { anim: newAnimState })
		}
		default:
			return state
	}
}

export default contentReducer;
