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
export const getActiveObject = (state) => (
	getProp(state, "app", "activeObject")
)

export const getProp = function(state, name, prop){
	const objectData = getObject(state, name)
	return objectData.props[prop]
}
export const getDef = (state, name, prop) => (
	getProp(state, name, prop)
)

export const getValue = (state, name, prop) => {
	const def = getDef(state, name, prop)
	const jsType = typeof def
	if (jsType === 'number' || jsType === 'string' || jsType === 'boolean'){
		return def
	} else {
		//in the form [object, prop1, prop2...]
		return def.reduce((objectId, propId) => (getValue(state, objectId, propId)))

	}
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
