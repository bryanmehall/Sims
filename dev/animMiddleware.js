import { getActiveTweens, tween, audio } from "./anim"
import { getValue, getAnimatable, getMax, getPlaying } from './ducks/quantity/selectors'
import QuantityActions from './ducks/quantity/actions'

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

	if (action.type === "SET_VALUE" && action.payload.name === 'animTime'){
		var state = store.getState()
		var prevTime = getValue(state, 'animTime')
		var t = action.payload.value
		var activeTweens = getActiveTweens(prevTime, t)
		tween(store, activeTweens, t)
		if (audio.paused){
			audio.currentTime = t
		}
	} else if (action.type === 'ANIM_PLAY') {

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