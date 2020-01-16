//import types from "./types";
import ObjectActions from '../object/actions'
const setValue = (name, value, keepHistory=false) => (
	ObjectActions.setProp(name, 'value', value)//need to keep history
)

	/*{
	type: "SET_VALUE",
	payload: {
		name: name,
		value: value,
		keepHistory: keepHistory
	}
})*/

const setPlay = (name, value) => {
	if (value === true) {
		return ObjectActions.setProp(name, 'playing', true)
	} else {
		return ObjectActions.setProp(name, 'playing', false)
	}
}

const animStep = (name, initTime, initValue) => ({
	type: 'ANIM_STEP',
	payload: {
		name, initValue, initTime
	}
})

function invert(tValue, scale) {
	var range = scale.max - scale.min;
	var tRange = scale.tMax - scale.tMin;
	return (tValue - scale.tMin) / tRange * range + scale.min;
}

const setValueFromCoords = (name, tValue, scale) => {
	var value = invert(tValue, scale) //should be in reducer?
	return setValue(name, value)
}

const setHighlight = (name, value) => ({
	type: "SET_HIGHLIGHT",
	payload: {
		name,
		value
	}
})


export default {
	setValue,
	setValueFromCoords,
	setHighlight,
	setPlay,
	animStep
};
