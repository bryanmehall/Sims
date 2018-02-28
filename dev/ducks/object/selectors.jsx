import murmurhash from 'murmurhash' //switch to sipHash for data integrity?

export const getObject = function (state, id) {
	//this should only be a shim for values defined in json
	const objectState = state.sim.object
	try {
		var objectData = Object.assign({}, objectState[id])
		objectData.props.id = id
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
const combineArgs = (args) => {
    const reduced = args.reduce( (combined, prim)=>(Object.assign(combined, prim.args)),{})
    return reduced
}
//build string of function from {string:" ", args:[]} object and add that function to the function table
const buildFunction = (primitive) => {
    const argsList = Object.keys(primitive.args)
    const func = new Function(argsList, primitive.string)
    functionTable[primitive.hash] = func
    return {name:primitive.hash, args:argsList}
}
const foldPrimitive = (state, argumentPrimitives, objectData) => {//list of dependent objects in the form [{string:..., args:...}]
    const objectName = eval(getJSValue(state, 'placeholder', "name", objectData))//switch to comparing hashes?
    const args = combineArgs(argumentPrimitives)//combine arguments of sub functions
    const searchArgs = Object.entries(args).filter((arg) => (arg[1].hasOwnProperty('query'))) //separate arguments that are searches
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    let varDefs = [] //place to put variable defs for resolved searches
    searchArgs.forEach((searchArg)=>{
        const argKey = searchArg[0] //key of arg
        const query = searchArg[1].query
        const getStack = searchArg[1].getStack
        if(query === objectName){//get is entirely contained within higher level function
            const result = getStack.reduce( (currObjData, getObject)=>{
                const attr = getObject.props.attribute
                return getValue(state, 'placeholder', attr, currObjData)
            }, objectData)
            const jsResult = getValue(state, 'placeholder', 'jsPrimitive', result)
            delete args[argKey] //remove resolved get from args
            varDefs.push(`var ${argKey} = ${jsResult.string};\n`)//be able to handle js result being another get
        } else {
            console.log('need to handle this else')
        }
    })
    const variableDefs = varDefs.join('')

    //eventually add support for inlining here
    return {hashes:argumentPrimitives.map(buildFunction), arguments:args, variableDefs}
}
const primitives = { //these should fold constants //move to new file?
	//numbers
	addition: {
		func: (args) => {
            console.log(args)
            return { string: `${args[0].string} + ${args[1].string}`, args: combineArgs(args) }
        },
		args: ['op1', 'op2'],
		ret: ['result']
	},
	subtraction: {
		func: (args) => (`${args[0]} - ${args[1]}`),
		args: ['op1', 'op2'],
		ret: ['result']
	},
    multiplication: {
		func: (args) => (`${args[0]} * ${args[1]}`),
		args: ['op1', 'op2'],
		ret: ['result']
	},
    division: {
		func: (args) => (`${args[0]} / ${args[1]}`),
		args: ['op1', 'op2'],
		ret: ['result']
	},
	//strings
	concat: (args) => (args.join("")),
    //bool
    or:{
        func:(args) => (`${args[0]} || ${args[1]}`),
        args: ['op1', 'op2'],
		ret: ['result']
    },
    and:{
        func:(args) => (`${args[0]} && ${args[1]}`),
        args: ['op1', 'op2'],
		ret: ['result']
    },
    equal:{
        func:(args) => (`${args[0]} == ${args[1]}`),
        args: ['op1', 'op2'],
		ret: ['result']
    },
    lessThan:{
        func:(args) => (`${args[0]} \< ${args[1]}`),
        args: ['op1', 'op2'],
		ret: ['result']
    },
    greaterThan:{
        func:(args) => (`${args[0]} \> ${args[1]}`),
        args: ['op1', 'op2'],
		ret: ['result']
    },
	//sets
	union: {
		func: (args) => ([].concat(args[0], args[1])),
		args: ['set1', 'set2'],
		ret: ['result']
	},
    setToArray: {
		func: (args) => {
            console.log('setToArray', args[0])
            return []
        },
		args: ['op1'],
		ret: ['result']
	}

}
let functionTable = {}//only js
let stateTable = {}
let objectTable = {}

export const compile = (state) => {
    const appData = getObject(state, 'app')
    const display = getValue(state, 'app', 'jsPrimitive', appData)
    const renderMonad = new Function('functionTable', `${display.string}`)//returns a thunk with all of render information enclosed
    return { renderMonad, functionTable }
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
	const hashData = Object.assign({}, objectData.props, { parentValue: "parent", hash: "hash" })
    const digest = "$hash"+murmurhash.v3(JSON.stringify(hashData))//hash(hashData)
    objectTable[digest] = objectData
	return digest
}

const objectFromHash = (hash) => {
    return objectTable[hash]
}
const isHash = (str) => {
    return str.includes("$hash")
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
/*
sample function for checkbox
checkbox(){
    return (){
        checkmark(20, "green")}
}
*/

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
    console.log('adding state')
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

const returnWithPrevValue = (name, attr, attrData, valueData, objectData) => {
    //adds previous value and parent value to props and reflexive attributes
    const key = name+attr
	if (objectData.type === 'app'){ //special case for root in this case app
        objectData = objectLib.undef
    }
    const parentHash = getHash(objectData)
    const hash = getHash(valueData)
    const hasInverse = attrData.props.hasOwnProperty('inverseAttribute') //if prop has inverse
    const inverse = hasInverse ? { [attrData.props.inverseAttribute]: parentHash }: {} //get inverse value (parent)
    const inverseAttrs = Object.assign({ parentValue: parentHash, hash }, inverse)
	const propsWithoutPrevious = Object.assign({}, valueData.props, { prevVal: valueData })
	const valueWithoutPrevious = Object.assign({}, valueData, { props: propsWithoutPrevious })
	const prevVal = null//addState(key, valueWithoutPrevious)
    //console.log(JSON.stringify(objectData).length, attr, parentHash)
	if (prevVal === null){
		const newProps = Object.assign(Object.assign({}, valueData.props, inverseAttrs))
		return Object.assign(Object.assign({}, valueData, { props: newProps }))
	} else {
		const newProps = Object.assign(Object.assign({}, valueData.props, inverseAttrs))
		//if (valueData.props.id === "textRepresentation"){console.log('&&&&&&&&&abc', attr, objectData, valueData)}
		return Object.assign(Object.assign({}, valueData, { props: newProps }))
	}
}
let timer = performance.now()
let counter = 0

const limiter = (timeLimit, countLimit)=>{
    const dt = performance.now()-timer
    counter+=1
    if (counter>countLimit){
        throw 'count'
    } else if (dt>timeLimit){
        throw 'timer'
    }
}

export const getValue = (state, name, prop, objectData) => { //get Value should be called eval and will need to support async actions eventually
    if (objectData.props.hasOwnProperty('hash') && objectData.props.hash !== getHash(objectData)){
        console.log(objectData)
        throw new Error("hashes not equal")
    }
    //console.log('getting', dt, prop)
    if (objectData === undefined){
		throw new Error('must have object def for '+prop) //"get rid of this when everything is switched"
	} else if (typeof objectData === "string" && isHash(objectData)){
        objectData = objectFromHash(objectData)
    }
	let def = objectData.props[prop]
    if (typeof def === "string" && isHash(def)){
        def = objectFromHash(def)
    }
    const attrData = typeof prop === 'string' ? getObject(state, prop) : prop //pass prop data in
	//console.log(def, prop)
	if (def === undefined && prop !== 'attributes'){ //refactor //shim for inherited values
		let inheritedData
		if (objectData.type === 'object'){
			return objectLib.undef
		}
		if (!objectData.props.hasOwnProperty('instanceOf')) {
			inheritedData = getObject(state, 'object')//objectlib.object
		} else {
			inheritedData = getValue(state, 'placeholder', 'instanceOf', objectData) //parent is passed in?
		}
        def = inheritedData.props[prop]
	}
	const valueData = typeof def === 'string' ? getObject(state, def) : def//consequences of making async?
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
					return {string:JSON.stringify(valueData.value), args:{}}
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'placeholder', 'numericalEquiv', objectData)
					const equivValue = getValue(state, 'placeholder', 'jsPrimitive', equivObjectData)
					return {string:equivValue, args:{}}
				}
			}
			case 'bool': {
				if (valueData.hasOwnProperty('value')) {
					return JSON.stringify(valueData.value)
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
					return  JSON.stringify(valueData.value)//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!security risk if brackets are allowed in string
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'name', 'stringEquiv', objectData)
					const equivValue = getValue(state, 'equivObject', 'jsPrimitive', equivObjectData)
					return equivValue
				}
			}
			case 'function': {
                const name = getJSValue(state, 'placeholder', 'name', objectData)//get rid of this eval
                console.log('name', name)
                if (!functionTable.hasOwnProperty(name)){
                    const result = getJSValue(state, 'placeholder', 'result', objectData)
                    console.log('result', result, objectData)
                    functionTable[name] = `function ${eval(name)}(op1){${result}}`
                }
				return name
			}
			case 'apply': {
				const functionName = eval(getJSValue(state, 'placeholder', 'function', objectData)) //get js primitive of function
				if (primitives.hasOwnProperty(functionName.type)){
                    const functionPrimitive = primitives[functionName.type]
                    const argNames = functionPrimitive.args
                    const func = functionPrimitive.func
                    //for each: get jsPrimitive of argument
                    console.log('obj', getValue(state, 'placeholder', 'op2', objectData))
                    const args = argNames.map((argName) => (getJSValue(state, 'placeholder', argName, objectData)))
                    const result = func(args)
                    return result
                } else {
                    //eventually get args from a set and then retrieve those from apply
                    //eventully move this to postprocessor
                    //

                    const name = getJSValue(state, 'placeholder', 'function', objectData)
                    console.log('functionData', name, objectData)
                    const op1 = getJSValue(state, 'placeholder', 'op1', objectData)
                    const applyString = `${name}(${op1})`
                    return applyString
                }
			}
			case 'set': {//there shouldn't be js primitive for sets?
				const equivObjectData = getValue(state, 'placeholder', 'setEquiv', objectData)
                //console.log(equivObjectData)
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
                const equivArrayData = getValue(state, 'placeholder', 'arrayEquiv', objectData)

                if (equivArrayData.type === "undef"){
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
                    const array = createArray(firstElement, [])
                    return array
                } else {
                    console.log("no array equiv")
                    return []
                }
            }

            case 'get': {
                const parent = getValue(state, 'placeholder', "parentValue", objectData)
                const parentName = eval(getJSValue(state, 'placeholder', "name", parent)) //switch this to comparing hash?
                const rootObject = getJSValue(state, 'placeholder',"rootObject", objectData)
                const searchArgs = Object.entries(rootObject.args).filter((arg) => (arg[1].hasOwnProperty('query')))
                const query = searchArgs[0][1].query
                const getStack = searchArgs[0][1].getStack//this only works for one search. is more than one ever needed in args?
                /*current assumptions:
                    get attribute is not parent value
                    get is one level deep
                    search is always root element of get
                    attribute is a string not an object
                */
                if(query === parentName){//get is entirely contained within higher level function
                    //#####does this check need to be done in combine args?
                    getStack.push(objectData)
                    const result = getStack.reduce( (parentData, objectData)=>{
                        const attr = objectData.props.attribute
                        return getValue(state, 'placeholder', attr, parentData)
                    }, parent)
                    return getValue(state, 'placeholder', 'jsPrimitive', result)
                } else {
                    const hash = objectData.props.hash
                    const nestedGet = { string:hash , args: {[hash]:{query, getStack:[...getStack, objectData]}} }
                    return nestedGet
                }
			}
			case 'search': {//replace this with a call to database(closer to concept of new)
                const query = def.query
                const hash = objectData.props.hash
                return { string: hash, args: {search:{query, getStack:[]}} }
			}
            case 'ternary': {
                const condition = getJSValue(state, 'placeholder', 'condition', objectData)
                const then = getJSValue(state, 'placeholder', 'then', objectData)
                const alt = getJSValue(state, 'placeholder', 'alt', objectData)
                return {string:`if(${condition}){${then}} else {${alt}}`, args:{}}
            }
            case 'new': {
                return def.id
            }
			case 'id':{
				return def.id
			}
            //output primitives
            case 'circle': {
				const centerPoint = getValue(state, 'placeholder', 'centerPoint', objectData)
				const cx= getJSValue(state, 'placeholder', 'x', centerPoint)
				const cy = getJSValue(state, 'placeholder', 'y', centerPoint)
				const r = getJSValue(state, 'placeholder', 'radius', objectData)

				return {type:"Circle", cx, cy, r}//`display.circle(${cx},${cy},${r})`
			}
            case 'rectangle':{
                const pos = getValue(state, 'placeholder', 'pos', objectData)
				const x= getJSValue(state, 'placeholder', 'x', pos)
				const y = getJSValue(state, 'placeholder', 'y', pos)
				const width = getJSValue(state, 'placeholder', 'width', objectData)
                const height = getJSValue(state, 'argsplaceholder', 'height', objectData)
                const color = getJSValue(state, 'placeholder', 'color', objectData)
				return {type:"Rectangle", x, y, width, height, color}
            }
			case 'text': {
				const x = getJSValue(state, 'placeholder', 'x', objectData)
				const y = getJSValue(state, 'placeholder', 'y', objectData)
				const string = getJSValue(state, 'placeholder', 'innerText', objectData)
                const filteredString =  typeof string === "string" ? string : "undef"
				return {
                    hash:objectData.props.hash,
                    string:`return function(prim){prim.text(${x.string}, ${y.string}, ${filteredString}, 20 ,0 ,0 ,0 );}`,//this is the rendering function
                    args:combineArgs([x,y]) //combine args of x,y,text
                }
			}
			case 'group':{

				const children = getJSValue(state, 'placeholder', 'childElements', objectData)

				const noUndefChildren = children.filter((child) => (child !== undefined))
                const foldedPrimitives = foldPrimitive(state, noUndefChildren, objectData)
                const childFunctions = foldedPrimitives.hashes
                const variables = foldedPrimitives.variableDefs
                //need to sort by z-order
                const programText = childFunctions.map((func)=>(`functionTable.${func.name}(${func.args.join(",")})(prim)`)).join(";\n\t")
                //console.log('child', childFunctions[0], functionTable[childFunctions[0]]()())
                console.log(`${variables}; return function(prim){${programText}}`)
				return {string:`${variables}; return function(prim){${programText}}`, args:foldedPrimitives.arguments}
                //{type:"Group", children:noUndefChildren}
			}
            case 'app':{
                const graphicalRep = getJSValue(state, 'placeholder', 'graphicalRepresentation', objectData)
                return {
                    string:graphicalRep.string, //this needs to be changed for more inputs/outputs
                    args: combineArgs([graphicalRep.args])
                }
            }
			default: {
                if (def.hasOwnProperty('type')){
                    console.log(def)
                    return def
                } else {
                    throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
                }
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

		/*if (valueData.type === 'get' && prop !== 'parentValue') {
            //for sets set forEach attribute to true
            //is there a better way to avoid the parentValue check to prevent an infinite loop?
            const valueDataWithParent = returnWithPrevValue(name, prop, attrData, valueData, objectData)
			const rootObjectData = getValue(state, 'placeholder', 'rootObject', valueDataWithParent)
			const iterate = eval(getJSValue(state, 'placeholder', 'forEach', valueDataWithParent))
			const property = valueData.props.attribute
			if (typeof property !== 'string') { throw 'need to handle object props'}
			const root = rootObjectData.type === "undef" ? objectData : rootObjectData
			const parent = objectData.type === 'get' ? root : root//get rid of this
			if (iterate === undefined || iterate === false){
				if (property === 'rootObject'){throw 'nested can not be root'}
				const returnValue = getValue(state, 'placeholder', property, parent)
				return returnWithPrevValue(name, prop, attrData, returnValue, parent)
			} else if (iterate === true){
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
                console.log(iterate)
				throw 'invalid type for iterate flag'
			}


		} *//*else if (valueData.type === 'find' && prop !== 'attribute' & prop!== 'then' && prop ) { //find is relative to 'this' where get is relative to global object -- find is default
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

        } *//* if (valueData.type === 'search') {
			const query = getValue(state, 'placeholder','jsPrimitive', valueData) //name to search for
			const resultObjectData = getObject(state, query) //the only time to use getObject should be here????
            const getParentByName = (objData, query) => {
                const name = getJSValue(state, 'placeholder', 'name', objData)//name of objData
                const parentValue = getValue(state, 'placeholder', 'parentValue', objData)

                if (name === query){
                    return objData
                } else if (parentValue.type === 'undef'){
                    return resultObjectData
                    //throw new Error('no parent value found for '+ query+' in '+JSON.stringify(objData))
                } else {
                    const parent = objectFromHash(objData.props.parentValue)
                    return getParentByName(parent, query)
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
		}/* /*else if (valueData.type === 'ternary' && prop !== 'parentValue'&& prop!=='name' && prop !== 'condition'){//add js primitive but keep this indirection here too?
            const condition = getJSValue(state, 'placeholder', 'condition', valueData)
            console.log(condition)
			if (condition) { //eval then/else like this so then/else are lazily evaluated
				const value = getValue(state, 'placeholder', 'then', valueData)
				return returnWithPrevValue(name, prop, attrData, value, objectData)
			} else {
				const value = getValue(state, 'placeholder', 'alt', valueData)
				return returnWithPrevValue(name, prop, attrData, value, objectData)

			}
		}*/ //else {
			return returnWithPrevValue(name, prop, attrData, valueData, objectData)
		//}
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
