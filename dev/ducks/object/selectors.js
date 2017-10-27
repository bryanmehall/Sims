export const getObject = function (state, id) {
	const objectState = state.sim.object
	try {
		var objectData = Object.assign({}, objectState[id])
		objectData.props.id = id
		objectData.props.hash = id
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
	add: {
		func: (args) => (args[0]+args[1]),
		args: ['left', 'right'],
		ret: ['result']
	},
	multiply: (args) => (args[0]*args[1]),
	//strings
	concat: (args) => (args.join(""))
}


export const getValue = (state, name, prop) => {

	const def = getDef(state, name, prop)
	if (def === undefined){
		throw new Error(`def is undefined for ${prop} of ${name}`)
	}
	if (prop === 'jsPrimitive') {
		switch (def.type) {
			case 'number': {
				if (def.hasOwnProperty('value')) {
					return def.value
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObject = getValue(state, name, 'numericalEquiv')
					const equivValue = getValue(state, equivObject, 'jsPrimitive')
					return equivValue
				}
			}
			case 'bool': {
				if (def.hasOwnProperty('value')) {
					return def.value
				} else if (def.hasOwnProperty('input')) {
					return false //inputs[def.input]
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObject = getValue(state, name, 'logicalEquiv')
					const equivValue = getValue(state, equivObject, 'jsPrimitive')
					return equivValue
				}
			}
			case 'string': {
				if (def.hasOwnProperty('value')) {
					return def.value
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObject = getValue(state, name, 'stringEquiv')
					const equivValue = getValue(state, equivObject, 'jsPrimitive')
					return equivValue
				}
			}
			case 'function': {
				return def.function
			}
			case 'apply': {
				const functionName = getValue(state, getValue(state, name, 'function'), 'jsPrimitive') //get js primitive of function
				const functionPrimitive = primitives[functionName]
				const argNames = functionPrimitive.args
				const func = functionPrimitive.func
				//for each: get jsPrimitive of argument
				const args = argNames.map((argName) => (getValue(state, getValue(state, name, argName), 'jsPrimitive')))
				const result = func(args)
				return result
			}
			case 'set': {
				return def.elements
			}
			case 'union': {
				const set1 = getValue(state, getValue(state, name, 'set1'), 'jsPrimitive')
				const set2 = getValue(state, getValue(state, name, 'set2'), 'jsPrimitive')
				console.log('getting union of ', set1, set2)
				break;
			}
			case 'get': {
				return 'get primitive'
			}
			case 'circle': {
				return 'circle primitive'
			}
			case 'search': {
				return def.id
			}
			default: {
				throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
			}
		}
	} else {
		const objectData = getObject(state, def)//move this logic to primitive for get object
		if (objectData.type === 'get' && prop !== 'rootObject' && prop !== 'attribute') { //this will need to work for sets
			const rootObject = getValue(state, def, 'rootObject')
			const property = getDef(state, def, 'attribute')
			const value = getValue(state, rootObject, property)
			return value
		} else if (objectData.type === 'search') {
			return getValue(state, def, 'jsPrimitive')
		} else if (objectData.type === 'ternary'){
			const condition = getValue(state, getValue(state, def, 'condition'), 'jsPrimitive')
			if (condition) { //eval then/else like this so then/else are lazily evaluated
				return getValue(state, def, 'then')
			} else {
				return getValue(state, def, 'else')
			}
		} else {
			return def
		}

	}
}

export const listProps = (state, name) => {
	const objectData = getObject(state, name)
	return Object.keys(objectData.props)
}

export const listMatchingObjects = (state, query) => {
	//for now this does objectId but it needs to be updated to search for names, ....
	const keys = Object.keys(state.sim.object)
	const matches = keys.filter((id) => (id.includes(query)))
	return matches
}

export const getChildren = function (state, id) {
	const childId = getValue(state, id, "childElements") //extend for sets
	if (childId === null){ //remove this condition for multiple children and replace with reduce
		return []
	} else {
		const childElements = getValue(state, childId, 'jsPrimitive')
		return childElements.map((childId) => (getObject(state, childId)))
	}

	/*var objectData = getObject(state, id)
	var children = objectData.children
	var childData = children.map(function (childId) {
		return getObject(state, childId)
	})
	return childData*/
}
