import {
	createSelectors
}
from 'reselect'
import {
	getSymbol
}
from '../quantity/selectors'


const getObject = function (state, id) {
	const objectState = state.sim.object
	try {
		var objectData = Object.assign({}, objectState[id])
	objectData.props.id = id
	} catch (e){
		throw new Error("could not find object named "+id)
	}

	return objectData
}
export const getActive = function (state, name) {
    const objectData = getObject(state, name)
	return objectData.props.active
}

export const getProp = function(state, name, prop){
	const objectData = getObject(state, name)
	return objectData.props[prop]
}
export const listProps = function(state, name){
	const objectData = getObject(state, name)
	return Object.keys(objectData.props)
}


export const getChildren = function (state, id) {
	var objectData = getObject(state, id)
	var children = objectData.children
	var childData = children.map(function (childId) {
		return getObject(state, childId)
	})
	return childData
}
