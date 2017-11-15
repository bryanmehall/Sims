export const getObject = function (state, id) {
	const objectState = state.sim.object
	try {
		var objectData = Object.assign({}, objectState[id])
		objectData.props.id = id
		objectData.props.hash = id
		if (!objectData.props.hasOwnProperty('attributes')){
			objectData.props.attributes = 'object'
		}
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
	concat: (args) => (args.join("")),
	//sets
	union: {
		func: (args) => (args[0].concat(args[1])),
		args: ['set1', 'set2'],
		ret: ['result']
	}
}
export const getJSValue = (state, name, prop) => {
	const value = getValue(state, name, prop)
	const objectData = getObject(state, value) //replace eval: modify here
	if (objectData.type === 'undef'){
		return undefined
	} else {
		return getValue(state, objectData.props.id , 'jsPrimitive') //getValue of jsPrimitive works
	}

}
export const getId = (state, name, prop) => (
	getValue(state, name, prop)
)

export const getValue = (state, name, prop) => { //getValue should be called eval and will need to support async actions eventually
	const def = getDef(state, name, prop)
	if (def === undefined) {
		//throw new Error(`def is undefined for ${prop} of ${name}`)
        console.warn(`def is undefined for ${prop} of ${name}`)
        return 'undef'
	}
	if (prop === 'jsPrimitive') { // primitive objects
		switch (def.type) {
			case 'number': {
				if (def.hasOwnProperty('value')) {
					return def.value
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObject = getId(state, name, 'numericalEquiv')
					const equivValue = getId(state, equivObject, 'jsPrimitive')
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
					const equivObject = getId(state, name, 'logicalEquiv')
					const equivValue = getId(state, equivObject, 'jsPrimitive')
					return equivValue
				}
			}
			case 'string': {
				if (def.hasOwnProperty('value')) {
					return def.value
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObject = getId(state, name, 'stringEquiv')
					const equivValue = getId(state, equivObject, 'jsPrimitive')
					return equivValue
				}
			}
			case 'function': {
				return def.function
			}
			case 'apply': {
				const functionName = getJSValue(state, name, 'function') //get js primitive of function
				const functionPrimitive = primitives[functionName]
				const argNames = functionPrimitive.args
				const func = functionPrimitive.func
				//for each: get jsPrimitive of argument
				const args = argNames.map((argName) => (getJSValue(state, name, argName)))
				const result = func(args)
				return result
			}
			case 'set': {
				if (def.hasOwnProperty('elements')){
					return def.elements
				} else {
					const equivObject = getId(state, name, 'setEquiv')
					if (equivObject === undefined){
						throw 'set must have setEquiv property'
					}
					const equivValue = getValue(state, equivObject, 'jsPrimitive') //ok js primitive returns primitive

					return equivValue
				}
			}
			case 'get': {
				return 'get primitive'
			}
			case 'circle': {
				return 'circle primitive'
			}
			case 'search': {
                // {type: "search", id:"idHere"}
				return def.id
			}
            case 'new': {
                return def.id
            }
			default: {
				throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
			}
		}
	} else { //pointer objects
		const objectData = getObject(state, def)//move this logic to primitive for get object
        if (objectData.type === 'get' && prop !== 'rootObject' && prop !== 'attribute') { //this will need to work for sets
			const rootObject = getId(state, def, 'rootObject')
			const property = getDef(state, def, 'attribute')
            //console.log('getting', name, prop, def, rootObject)
            if (rootObject === "undef") { //get from parent object 'name'
                return getValue(state, name, property)
            } else {
                return getValue(state, rootObject, property)

            }
		} else if (objectData.type === 'find') { //find is relative to 'this' where get is relative to global object -- find is default
            //def refers to find object, name refers to 'this'
            if (prop === 'attribute' || prop === 'then') { return def }
            let path = []
			const scope = getId(state, name, "scope")
			//need to find a good ui for scope...how to determine "this"
			const root = (scope === "undef") ? name : scope
            const getPath = (currentFind) => {
                const attr = getId(state, currentFind, 'attribute')
                path.push(attr)
                const then = getId(state, currentFind, 'then')
                if (then !== 'undef'){
                    getPath(then)
                }
            }
            getPath(def)
            const findReducer = (currentObject, attribute) => (
                getId(state, currentObject, attribute)
            )
			console.log(root, path)

            return path.reduce(findReducer, root)

        } else if (objectData.type === 'search') {
			return getValue(state, def, 'jsPrimitive')
        } else if (objectData.type === 'new'){
			console.log('creating new object')

			return {type:'objectType'}
		} else if (objectData.type === 'ternary'){
			const condition = getJSValue(state, def, 'condition')
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
    try {
        var childId = getValue(state, id, "childElements") //extend for sets
    } catch (e){
        return []
    }

	if (childId === null){ //remove this condition for multiple children and replace with reduce
		return []
	} else {
		const childElements = getValue(state, childId, 'jsPrimitive')
		const elements = childElements === 'undef' ? [] : childElements
		return elements.map((childId) => (getObject(state, childId)))
	}

	/*var objectData = getObject(state, id)
	var children = objectData.children
	var childData = children.map(function (childId) {
		return getObject(state, childId)
	})
	return childData*/
}
