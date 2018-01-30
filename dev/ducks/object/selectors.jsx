import hash from 'object-hash'

export const getObject = function (state, id) {
	//this should only be a shim for values defined in json
	const objectState = state.sim.object
	try {
		var objectData = Object.assign({}, objectState[id])
		objectData.props.id = id
		objectData.props.hash = id
		return objectData
	} catch (e){
		throw new Error("could not find object named "+JSON.stringify(id))
	}
}

export const getActive = function (state, name) {
    const objectData = getObject(state, name)
	return objectData.props.active
}

export const getDef = (state, name, prop) => {
	const objectData = getObject(state, name)
	return objectData.props[prop]
}
const primitives = { //move to new file?
	//numbers
	add: {
		func: (args) => (args[0]+args[1]),
		args: ['op1', 'op2'],
		ret: ['result']
	},
	multiply: (args) => (args[0]*args[1]),
	//strings
	concat: (args) => (args.join("")),
	//sets
	union: {
		func: (args) => ([].concat(args[0], args[1])),
		args: ['set1', 'set2'],
		ret: ['result']
	}
}
export const getJSValue = (state, name, prop, objData) => {

	//const objectData = objData === undefined ? getObject(state, name) : objData
	const valueData = getValue(state, 'placeholder', prop, objData)
    //if (prop === 'subset2'){console.log('gettingJS', name, prop, objData, valueData)}
	//const objectData = getObject(state, value) //replace eval: modify here
	if (valueData.type === 'undef'){
		return undefined
	} else {

		return getValue(state, 'placeholder' , 'jsPrimitive', valueData) //get Value of jsPrimitive works
	}
}
const getHash = (objectData) => {
	const hashData = objectData.props
	//delete hashData.hash
	return hash(hashData)
}

export const getId = (state, name, prop, valueDef) => {
	const objectData = valueDef === undefined ? getValue(state, 'placeholder', prop, getObject(state, name)) : valueDef
	if (objectData.props === undefined) {
		return 'undef'
	} else if (!objectData.props.hasOwnProperty('id')){
		throw new Error(`${prop} of ${name} object does not have id`)
	}
	return objectData.props.id
}
let stateTable = {}
export const objectLib = {
	id: (id) => ({
		type:'id',
		props:{
			jsPrimitive:{type:'id', id}
		}
	}),
	undef: {
		type: 'undef',
		props: {
			id: 'undef'
		}
	},
	union: (set1, set2, scope) => ({
		type: 'apply',
		props: {
			set1: set1,
			set2: set2,
			id: 'union',
			function: 'unionFunction',
			scope,
			jsPrimitive: { type: 'apply' }
		}
	}),
	find: (attrList) => { //switch this to get?
		if (attrList.length === 1){
			return {
				type: "find",
				props: {
					jsPrimitive: { type: "find" },
					attribute: attrList[0]
				}
			}
		} else {
			const currentAttr = attrList.shift()
			return {
				type: "find",
				props: {
					jsPrimitive: { type: "find" },
					attribute: currentAttr,
					then: objectLib.find(attrList)
				}
			}
		}

	},
	constructSearch: (query) => ({ //add support for searching different databases
		type: 'search',
		props: {
			query,
			id:'search'+query,
			jsPrimitive: { type: 'search', id: query }
		}
	}),
	constructSet: function(id, elements){
		const length = elements.length
		if (length === 1){
			return elements[0]
		} else {

			const set1 = this.constructSet('sub1'+id, elements.slice(0, length/2))
			const set2 = this.constructSet('sub2'+id, elements.slice(length/2))
			return {
				type: 'set',
				props: {
					jsPrimitive: { type: 'set' },
					subset1: set1,
					subset2: set2,
					id: id
				}
			}
		}
	}
}

//####################################
//careful, this state scheme might not work if updates are nested more than one level deep...if the change is below a search
//####################################
const addState = (key, value) => { //returns prevValue Data
	//this is for dirty checking. is it possible to only update dependencies?
	if (stateTable.hasOwnProperty(key)){ //key has been evaluated
		const needsUpdate = JSON.stringify(value) !== JSON.stringify(getPrevValue(key)) //only update if the value actually changed
		if (needsUpdate){ //value has changed
			const prevVal = stateTable[key]
			stateTable[key] = value
			return prevVal
		} else {
			return null
		}
	} else { //key has never been evaluated --also means that it needs update so value is returned
		stateTable[key] = value
		return value
	}
}

const getPrevValue = (key) => { //get previous
	if (stateTable.hasOwnProperty(key)){
		return stateTable[key]
	} else {
		return null
	}
}

const returnWithPrevValue = (name, attr, attrData,  valueData, objectData) => { //adds previous value and parent value to props and reflexive attributes
	const key = name+attr
	if (objectData.type === 'app'){ //special case for root in this case app
        objectData = objectLib.undef
    }
    const hasInverse = attrData.props.hasOwnProperty('inverseAttribute') //if prop has inverse
    const inverse = hasInverse ? {[attrData.props.inverseAttribute]:objectData}: {} //get inverse value (parent)
    const inverseAttrs = Object.assign({parentValue:objectData}, inverse)
	const propsWithoutPrevious =  Object.assign({}, valueData.props, { prevVal: valueData })
	const valueWithoutPrevious = Object.assign({}, valueData, { props: propsWithoutPrevious })
	const prevVal = addState(key, valueWithoutPrevious)
    console.log(JSON.stringify(objectData).length, attr)
	if (prevVal === null){
		const newProps = Object.assign(Object.assign({}, valueData.props, inverseAttrs))
		//if (valueData.props.id === "textRepresentation"){console.log('$$$$$$$$$abc', attr, objectData, valueData)}
		return Object.assign(Object.assign({}, valueData, { props:newProps }))
	} else {
		const newProps = Object.assign(Object.assign({}, valueData.props, { prevVal}, inverseAttrs))
		//if (valueData.props.id === "textRepresentation"){console.log('&&&&&&&&&abc', attr, objectData, valueData)}
		return Object.assign(Object.assign({}, valueData, { props:newProps }))
	}
}
let counter = 0
export const getValue = (state, name, prop, objectData) => { //get Value should be called eval and will need to support async actions eventually
    if (objectData === undefined){
		throw new Error('must have object def for '+prop) //"get rid of this when everything is switched"
	}

	let def = objectData.props[prop]
    const attrData = typeof prop === 'string' ? getObject(state, prop) : prop
	//console.log(def, prop)
	if (def === undefined && prop !== 'attributes'){ //refactor //shim for inherited values
		let inheritedData
		if (objectData.type === 'object'){
			return objectLib.undef
		}

		if (!objectData.props.hasOwnProperty('instanceOf')){
			inheritedData = getObject(state, 'object')
		} else {
			inheritedData = getValue(state, 'placeholder', 'instanceOf', objectData)
		}
        def = inheritedData.props[prop]
	}
	const valueData = typeof def === 'string' ? getObject(state, def) : def
	name = objectData.props.id
	if (objectData === undefined) {
		console.log('object data undefined for ', name, prop, 'ObjectData: ', objectData)
		throw new Error()
	}

	if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
		if (objectData.props.hasOwnProperty('attributes')){
			const attributeData = objectLib.union(valueData, objectLib)
			return returnWithPrevValue(name, prop,attrData, valueData, objectData)
		} else {
			let attrs = Object.keys(objectData.props)
			attrs.unshift('prevVal')
			attrs.unshift('attributes')
			const attrSet = objectLib.constructSet(`${objectData.props.id}Attrs`,attrs)
			return returnWithPrevValue(name, prop,attrData, attrSet, objectData)
		}
	}
	if (def === undefined) {
		//throw new Error(`def is undefined for ${prop} of ${name}`)
		//console.warn(`def is undefined for ${prop} of ${name}`)
		return objectLib.undef
	} else if (prop === 'jsPrimitive') { // primitive objects
		switch (valueData.type) {
			case 'number': {
				if (valueData.hasOwnProperty('value')) {
					return valueData.value
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'placeholder', 'numericalEquiv', objectData)
					const equivValue = getValue(state, 'placeholder', 'jsPrimitive', equivObjectData)
					return equivValue
				}
			}
			case 'bool': {
				if (valueData.hasOwnProperty('value')) {
					return valueData.value
				} else if (valueData.hasOwnProperty('input')) {
					return false //inputs[def.input]
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'placeholder', 'logicalEquiv', objectData)
					const equivValue = getValue(state, 'equivObject', 'jsPrimitive', equivObjectData)
					return equivValue
				}
			}
			case 'string': {
				if (valueData.hasOwnProperty('value')) {
					return valueData.value
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'name', 'stringEquiv', objectData)
					const equivValue = getValue(state, 'equivObject', 'jsPrimitive', equivObjectData)
					return equivValue
				}
			}
			case 'function': {
				return valueData.function
			}
			case 'apply': {
				const functionName = getJSValue(state, 'placeholder', 'function', objectData) //get js primitive of function
				const functionPrimitive = primitives[functionName]
				const argNames = functionPrimitive.args
				const func = functionPrimitive.func
				//for each: get jsPrimitive of argument
				const args = argNames.map((argName) => (getJSValue(state, 'placeholder', argName, objectData)))
				const result = func(args)
				return result
			}
			case 'set': {//there shouldn't be js primitive for sets?
				const equivObjectData = getValue(state, 'placeholder', 'setEquiv', objectData)
				if (equivObjectData.type === "undef"){
					const set1 = getJSValue(state, 'placeholder', 'subset1', objectData)
					const set2 = getJSValue(state, 'placeholder', 'subset2', objectData)
					return [].concat(set1, set2)
				} else {
					const equivValue = getValue(state, 'placeholder', jsPrimitive, equivObjectData) //ok js primitive returns primitive
					return equivValue
				}
			}
            case 'array': {
                const firstElement = getValue(state, 'placeholder', 'firstElement', objectData)
                const createArray = (element, array) => {
                    if (element.type === 'undef'){
                        return array
                    } else {
                        const value = getJSValue(state, 'placeholder', 'value', element)
                        const nextElement = getValue(state, 'placeholder', 'nextElement', element)
                        return createArray(nextElement, array.concat(array, [value]))
                    }
                }


                return createArray(firstElement, [])
            }
			case 'get': {

				return 'get primitive'
			}
			case 'accordianRep': {
				return <div>test</div>
			}
			case 'circle': {
				const centerPoint = getValue(state, 'placeholder', 'centerPoint', objectData)
				const cx= getJSValue(state, 'placeholder', 'x', centerPoint)
				const cy = getJSValue(state, 'placeholder', 'y', centerPoint)
				const r = getJSValue(state, 'placeholder', 'radius', objectData)

				return {type:"Circle", cx, cy, r}//`display.circle(${cx},${cy},${r})`
				/*(`

					context.beginPath();
      				context.arc(${cx}, ${cy}, ${r}, 0, 2 * Math.PI, false);
      				context.fillStyle = 'black';
      				context.fill();
      				context.lineWidth = 5;
      				context.strokeStyle = '#003300';
					context.stroke();
				`)*/
			}

            case 'rectangle':{
                const pos = getValue(state, 'placeholder', 'pos', objectData)
				const x= getJSValue(state, 'placeholder', 'x', pos)
				const y = getJSValue(state, 'placeholder', 'y', pos)
				const width = getJSValue(state, 'placeholder', 'width', objectData)
                const height = getJSValue(state, 'placeholder', 'height', objectData)
				return {type:"Rectangle", x, y, width, height}
            }
			case 'text': {
				const pos = getValue(state, 'placeholder', 'pos', objectData)
				const x = getJSValue(state, 'placeholder', 'x', pos)
				const y = getJSValue(state, 'placeholder', 'y', pos)
				const string = getJSValue(state, 'placeholder', 'innerText', objectData)
                const filteredString =  typeof string === "string" ? string : "undef"
				return { type: "Text", x, y, string:filteredString }
			}
			case 'search': {
                // {type: "search", id:"idHere"}
				return def.query
			}
            case 'new': {
                return def.id
            }
			case 'id':{
				return def.id
			}
			case 'group':{
				const children = getJSValue(state, 'placeholder', 'childElements', objectData)
				const noUndefChildren = children.filter((child) => (child !== undefined))

				return {type:"Group", children:noUndefChildren}
			}
			default: {
				throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
			}
		}
	} else { //pointer objects
		//replace these with js primitives ie: jsPrimitive of ternary is {type: ternary, condition:jsprimitive of condition...}
		/*{
						"type":"get",
						"props":{
							"rootObject":{
								"type":"get",
								"props":{
									"rootObject":"textRepresentation",
									"attribute":"parentValue"
								}
							},
							"attribute":"name"
						}
					}*/

		if (valueData.type === 'get' && prop !== 'parentValue') {
            //for sets set forEach attribute to true
            //is there a better way to avoid the parentValue check to prevent an infinite loop?
			counter += 1
			if (counter > 50){
                throw 'count'
            }
			//console.log(prop, 'of', objectData, 'is')
            const valueDataWithParent = returnWithPrevValue(name, prop, attrData, valueData, objectData)
			const rootObjectData = getValue(state, 'placeholder', 'rootObject', valueDataWithParent)
			const iterate = getValue(state, 'placeholder', 'forEach', valueDataWithParent)
			const property = valueData.props.attribute
			if (typeof property !== 'string') { throw 'need to handle object props'}
			const root = rootObjectData.type === "undef" ? objectData : rootObjectData
			const parent = objectData.type === 'get' ? root : root//get rid of this
			if (iterate.type === 'undef' || iterate.type === 'false'){
				if (property === 'rootObject'){throw 'nested can not be root'}
				const returnValue = getValue(state, 'placeholder', property, parent)
				return returnWithPrevValue(name, prop, attrData, returnValue, parent)
			} else if (iterate.props.id === 'true'){
				const elements = getSetData(state, root)
				const values = elements.map(
					(element) => {
						const elemValue = getValue(state, 'placeholder', property, element)
						const elemReturn = returnWithPrevValue(name, prop,attrData, elemValue, objectData)
						return elemReturn
					}
				)
				const returnValue = objectLib.constructSet('needToChangeSetId', values)
				return returnWithPrevValue(name, prop,attrData, returnValue, objectData)
			} else {
				throw 'invalid type for iterate flag'
			}


		} else if (valueData.type === 'find' && prop !== 'attribute' & prop!== 'then' && prop ) { //find is relative to 'this' where get is relative to global object -- find is default
            //def refers to find object, name refers to 'this'
			console.log(parentObject)
			throw 'need to fix or remove find'
            let path = []
			const scope = getId(state, name, "scope")
			//need to find a good ui for scope...how to determine "this"
			const root = (scope === "undef") ? name : scope
            const getPath = (currentFind) => {//##########refactor duplicate
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
			const resultId = path.reduce(findReducer, root)

            return getObject(state, resultId) //needs to return objectData for full result

        } else if (valueData.type === 'search') {
			const query = getValue(state, 'placeholder','jsPrimitive', valueData) //name to search for
			const resultObjectData = getObject(state, query) //the only time to use getObject should be here????
            const getParentByName = (objData, query) => {
                const name  = getJSValue(state, 'placeholder', 'name', objData)
                const parentValue = getValue(state, 'placeholder', 'parentValue', objData)
                if (name === query){
                    return objData
                } else if (parentValue.type === 'undef'){
                    return resultObjectData
                    //throw new Error('no parent value found for '+ query+' in '+JSON.stringify(objData))
                } else {
                    return getParentByName(objData.props.parentValue, query)
                }
            }
            const result = getParentByName(objectData, query)
			return result//resultObjectData
        } else if (valueData.type === 'new'){
			const generatorData = getObject(state, def).props.jsPrimitive
			const type = generatorData.querry
			const id = generatorData.id
			return {
				type: type,
				props: {
					id: id,
					instanceOf: type,
					attributes: 'findParent'
				}
			}
		} else if (valueData.type === 'ternary'){
			const condition = getJSValue(state, 'placeholder', 'condition', valueData)

			if (condition) { //eval then/else like this so then/else are lazily evaluated
				const value = getValue(state, 'placeholder', 'then', valueData)
				return returnWithPrevValue(name, prop, attrData, value, objectData)
			} else {
				const value = getValue(state, 'placeholder', 'else', valueData)
				return returnWithPrevValue(name, prop, attrData, value, objectData)

			}
		} else {
			return returnWithPrevValue(name, prop, attrData, valueData, objectData)
		}
	}
}

export const getSetData = (state, objectData) => {
	const type = objectData.type
	if (type === 'set'){
		const subset1 = getValue(state, 'placeholder', 'subset1', objectData)
		const subset2 = getValue(state, 'placeholder', 'subset2', objectData)
		const set1Array = getSetData(state, subset1)
		const set2Array = getSetData(state, subset2)
		if (set1Array.type === 'undef'){
			return set2Array
		} else if (set2Array.type === 'undef'){
			return set1Array
		} else {
			return set1Array.concat(set2Array)
		}
	} else {
		return [objectData]
	}
}
