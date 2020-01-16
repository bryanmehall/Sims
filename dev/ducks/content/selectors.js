
//course selectors
export const getCurrentCourseId = (state) => (state.content.activeCourse)
export const getCourseById = (state, courseId) => {
	return state.content.courses.find(
		(courseData) => (
			courseData.courseId === courseId
		)
	)
}
const getCurrentCourse = (state) => (getCourseById(state, getCurrentCourseId(state)))
export const getCourseTitle = (state, courseId) => (getCourseById(state, courseId).title)
export const getCourseDescription = (state, courseId) => (getCourseById(state, courseId).description)
export const courseIsLoading = (state, courseId) => {
	const courseData = getCourseById(state, courseId)//switch to routing thunks?
	return (courseData === undefined) ? true : courseData.loading
}

//part selectors
export const getCurrentPartId = (state) => {
	return state.content.activePart
}
const getPartById = (state, courseId, partId) => {
	return state.content.parts.find(
		(partData) => (
			partData.courseId === courseId && partData.partId === partId
		)
	)
}
const getPartsOfCourse = (state, courseId) => {
	return state.content.parts.filter(
		(partData) => (
			partData.courseId === courseId
		)
	)
}

export const getPartIdByIndex = (state, courseId, index) => {
	const part = getPartsOfCourse(state, courseId)[index]
	if (part === undefined){
		return undefined
	} else {
		return part.partId
	}
}

export const getPartTitle = (state, courseId, partId) => (getPartById(state, courseId, partId).title)
const getCurrentPart = (state) => (getPartById(state, getCurrentPartId(state)))
// contentBlock
const getCurrentContentBlock = (state) => (state.content.currentContent)




export const getParts = (state, courseId) => {return getCourseById(state, courseId).parts}

export const getPart = (state, partId) => (
	getParts(state).find((part) => (part.id === partId))
)




//contentBlock selectors
export const getContentBlock = (state, partId, blockId) => (
	getContentBlocks(state, partId).find((block) => (block.id === blockId))
)
export const getCurrentContentBlockId = (state) => {
	return state.content.activeContentBlock
}
export const getContentBlocks = (state, courseId, partId) => (getPartById(state, courseId, partId).contentBlocks)
export const getContentBlockById = (state, courseId, partId, contentBlockId) => {
	return state.content.contentBlocks.find(
		(contentBlockData) => (
			contentBlockData.courseId === courseId &&
			contentBlockData.partId === partId &&
			contentBlockData.contentBlockId === contentBlockId
		)
	)
}
export const getContentBlockTitle = (state, courseId, partId, contentBlockId) => (
	getContentBlockById(state, courseId, partId, contentBlockId).title
)
export const getContentBlockType = (state, courseId, partId, contentBlockId) => (
	getContentBlockById(state, courseId, partId, contentBlockId).type
)
export const getContentBlockText = (state, courseId, partId, contentBlockId) => (
	getContentBlockById(state, courseId, partId, contentBlockId).text
)
export const getAnimPlaying = (state, courseId, partId, contentBlockId) => (
	getContentBlockById(state, courseId, partId, contentBlockId).anim.playing
)
export const getAnimLength = (state, courseId, partId, contentBlockId) => (
	getContentBlockById(state, courseId, partId, contentBlockId).anim.length
)
export const getAnimTime = (state, courseId, partId, contentBlockId) => (
	getContentBlockById(state, courseId, partId, contentBlockId).anim.time
)
