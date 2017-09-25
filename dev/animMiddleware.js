import { tween, getActiveTweens } from "./anim"
import { getValue, getAnimatable, getMax, getPlaying } from './ducks/quantity/selectors'
import { getAnimTime, getAnimPlaying, getAnimLength} from './ducks/content/selectors'
import {getKeyframes, getNext} from './ducks/sim/selectors'
import QuantityActions from './ducks/quantity/actions'
import ContentActions from './ducks/content/actions'

export const animMiddleware = store => next => action => {
	function animStep() {
		var t0 = action.payload.initTime
		var v0 = action.payload.initValue
		var t = Date.now()
		var value = (t-t0)/1000 + v0
		var name = action.payload.name
		var state = store.getState()
		var isPlaying = getPlaying(state, name)

		if (isPlaying) { //only update and continue if quantity is still playing
			store.dispatch(QuantityActions.setValue(name, value))
			store.dispatch(QuantityActions.animStep(name, t0, v0))
		}

	}
	function animStart(){
		var t = Date.now()
		var name = action.payload.name
		var state = store.getState()
		var initValue = getValue(state, name)
		store.dispatch(QuantityActions.animStep(name, t, initValue))
	}
	//for data collection
	if (action.type === "SET_VALUE" && action.payload.keepHistory === true){
		var state = store.getState()
		var time = getValue(state, 't')
		action.payload.previousPoint = { t:time, value:action.payload.value }
	}
	//for animation of
	if (action.type === "ANIM_CONTENT"){
		const initTime = Date.now()
		const state = store.getState()
		const { courseId, partId, contentBlockId } = action.payload
		const initAnimTime = getAnimTime(state, courseId, partId, contentBlockId)
		const stepAction = ContentActions.animContentStep(courseId, partId, contentBlockId, initTime, initAnimTime)
		requestAnimationFrame(()=>{store.dispatch(stepAction)})
	} else if (action.type === "ANIM_CONTENT_STEP") {
		const state = store.getState()
		const {courseId, partId, contentBlockId, initAnimTime, initTime} = action.payload
		const prevTime = getAnimTime(state, courseId, partId, contentBlockId )
		const t = Date.now()
		const newTime = ((t-initTime)/1000)+initAnimTime//time since last play
		//state, courseId, partId, contentBlockId, prevTime, newTime
		const playing = getAnimPlaying(state, courseId, partId, contentBlockId)
		const length = getAnimLength(state, courseId, partId, contentBlockId)
		const activeTweens = getActiveTweens(prevTime, newTime, getKeyframes(state))//getActiveTweens(prevTime, newTime)
		tween(store, activeTweens, newTime)
		if (playing){
			if (newTime > length){
				const setTimeAction = ContentActions.setAnimTime(courseId, partId, contentBlockId, length)
				const nextCourseId = 'about-zibit'
				const nextPartId = 'features'
				const nextContentBlockId = 'animations'
				const animCompleteAction = ContentActions.activateContentBlock(nextCourseId, nextPartId, nextContentBlockId)
				setTimeout(() => {store.dispatch(animCompleteAction)}, 1000)//wait 1 s before moving to next section
				store.dispatch(setTimeAction)
			} else {
				const stepAction = ContentActions.animContentStep(courseId, partId, contentBlockId, initTime, initAnimTime)
				const setTimeAction = ContentActions.setAnimTime(courseId, partId, contentBlockId, newTime)
				store.dispatch(setTimeAction)
				requestAnimationFrame(()=>{store.dispatch(stepAction)})
			}
		}
	} else if (action.type === "SET_ANIM_TIME"){
		const state = store.getState()
		const { courseId, partId, contentBlockId, time } = action.payload
		const prevTime = getAnimTime(state, courseId, partId, contentBlockId)
		const activeTweens = getActiveTweens(prevTime, time, getKeyframes(state))
		tween(store, activeTweens, time)
	} else if (action.type === 'SET_PROP' && action.payload.prop === 'playing' && action.payload.value === true) {
		requestAnimationFrame(animStart);
	} else if (action.type === 'ANIM_STEP') {
		requestAnimationFrame(animStep)
		function animStep() {
			var t0 = action.payload.initTime
			var v0 = action.payload.initValue
			var t = Date.now()
			var value = (t-t0)/1000 + v0
			var name = action.payload.name
			var state = store.getState()
            var max = getMax(state, name)
            var isPlaying = getPlaying(state, name)
			if (isPlaying) { //only update and continue if quantity is still playing
               if (value > max){
                    store.dispatch(QuantityActions.setValue(name, max))
                } else {
                    store.dispatch(QuantityActions.setValue(name, value))
                    store.dispatch(QuantityActions.animStep(name, t0, v0))
                }
			}

		}
	}
	next(action)
};
