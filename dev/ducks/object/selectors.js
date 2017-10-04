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
const primitives = { //move to new file?
	//numbers
	add: (args) => (args[0]+args[1]),
	multiply: (args) => (args[0]*args[1]),
	//strings
	concat: (args) => (args.join(""))
}

export const getValue = (state, name, prop) => {
	const def = getDef(state, name, prop)
	console.log(name, prop, def)
	const jsType = typeof def
	if (jsType === 'number' || jsType === 'string' || jsType === 'boolean'){
		return def
	} else if (def.length === 0) {
		return null
	} else if (def.hasOwnProperty('function')) {
		const args = def.args.map((arg) => (getValue(state, name, arg)))
		const fn = getValue(state, name, def.function)
		return primitives[fn](args)
	} else {
		//in the form [object, prop1, prop2...]
		return def.reduce((objectId, propId) => (getValue(state, objectId, propId)))
	}
	//extend child elements for multiple children
}

export const listProps = function(state, name){
	const objectData = getObject(state, name)
	return Object.keys(objectData.props)
}


export const getChildren = function (state, id) {
	const childId = getValue(state, id, "childElements") //extend for sets
	if (childId === null){ //remove this condition for multiple children and replace with reduce
		return []
	} else {
		return [getObject(state, childId)]
	}

	/*var objectData = getObject(state, id)
	var children = objectData.children
	var childData = children.map(function (childId) {
		return getObject(state, childId)
	})
	return childData*/
}
