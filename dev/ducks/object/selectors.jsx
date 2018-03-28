import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
/*
refactor todo:
    -make adding to function table a monad
    -switch render and prim to just io

*/
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
    const reduced = args.reduce((combined, prim) => (Object.assign(combined, prim.args)),{})
    return reduced
}

//build string of function from {string:" ", args:[]} object and add that function to the function table
const buildFunction = (primitive) => {
    if (primitive.inline){
        return primitive.string
    }
    const argsList = Object.keys(primitive.args).concat('functionTable')
    const func = new Function(argsList, 'return '+primitive.string)
    addToFunctionTable(primitive.hash, func)
    const primString = ""//primitive.args.prim ? "(prim)":""//hack to add(prim) to the end if it depends on prim--refactor

    return `functionTable.${primitive.hash}(${argsList.join(",")})${primString}`
}
const addToFunctionTable = (hash, func) => {//adding functions to table should become a monad
    functionTable[hash] = func
}
const foldPrimitive = (state, argumentPrimitives, objectData) => { //list of dependent objects in the form [{string:..., args:...}]
    const namePrimitive = getJSValue(state, 'placeholder', "name", objectData)
    const objectName = namePrimitive === undefined ? null : eval(namePrimitive.string)//switch to comparing hashes?
    let args = combineArgs(argumentPrimitives)//combine arguments of sub functions
    const searchArgs = Object.entries(args).filter((arg) => (arg[1].hasOwnProperty('query'))) //separate arguments that are searches
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree

    let varDefs = [] //place to put variable defs for resolved searches
    searchArgs.forEach((searchArg) => {
        const argKey = searchArg[0] //key of arg
        const query = searchArg[1].query
        const getStack = searchArg[1].getStack
        if (query === objectName){ //get is entirely contained within higher level function
            // state, objectData, getStack
            let currObjectData = objectData //this uses for loop instead of reduce for breaking on a get
            for (var i=0; i<getStack.length; i++){
                const getObject = getStack[i] //get first 'get' object off the stack
                const attr = getObject.props.attribute //attribute to go to
                const nextValue = getValue(state, 'placeholder', attr, currObjectData) //evaluate attr of currentobject
                if (nextValue.type === 'get'){
                    //get the jsPrimitive of the get that is pointed to
                    const jsGet = getValue(state, 'placeholder', 'jsPrimitive', nextValue)
                    //append remaining args on getstack to the end of jsGet's getStack
                    //get arguments of that get primitive
                    const nextArgs = jsGet.args[jsGet.hash]
                    //get the leftover path from the first get
                    //ie. if we are getting a.b.c and a.b is x.y.z then the get stack is x.y.z.c
                    const leftoverGetStack = getStack.slice(i+1)
                    const newGetStack = nextArgs.getStack.concat(leftoverGetStack)
                    //console.log(newGetStack)//resolve here if we can
                    args[argKey] = Object.assign({}, nextArgs, {getStack:newGetStack})
                    return
                }
                currObjectData = nextValue
            }
            const jsResult = getValue(state, 'placeholder', 'jsPrimitive', currObjectData)
            args = Object.assign({}, args, jsResult.args) //add args for variable defs to args for whole function
            //console.log('args', query, argKey, args)
            delete args[argKey] //remove resolved get from args
            varDefs.push(`var ${argKey} = ${jsResult.string};\n`)//be able to handle js result being another get
        } else {
             if (objectName === 'app'){throw 'no match found'}
        }

    })
    const variableDefs = varDefs.join('')
    const compiledFunctions = argumentPrimitives.map(buildFunction)
    const trace = argumentPrimitives.map((argPrim)=>(
        Object.assign({}, argPrim.trace, {name:objectName})
    ))
    return {hashes:compiledFunctions, arguments:args, variableDefs, trace}
}

let functionTable = {}//only js
let stateTable = {}
let objectTable = {}

export const compile = (state) => {
    const appData = getObject(state, 'app')
    const display = getValue(state, 'app', 'jsPrimitive', appData)
    const trace = display.trace
    const renderMonad = new Function('functionTable', `${display.string}`)//returns a thunk with all of render information enclosed
    return { renderMonad, functionTable, trace }
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

const getHash = (objectData) => { //this should check that all children are hashes before hashing ie not hashing the whole tree
	const hashData = Object.assign({}, objectData.props, { parentValue: "parent", hash: "hash" })
    const digest = "$hash"+murmurhash.v3(JSON.stringify(hashData))//hash(hashData)
    objectTable[digest] = objectData
	return digest
}

const objectFromHash = (hash) => (objectTable[hash])

const isHash = (str) => (str.includes("$hash"))


export const getId = (state, name, prop, valueDef) => {
	const objectData = valueDef === undefined ? getValue(state, 'placeholder', prop, getObject(state, name)) : valueDef
	if (objectData.props === undefined) {
		return 'undef'
	} else if (!objectData.props.hasOwnProperty('id')){
		throw new Error(`${prop} of ${name} object does not have id`)
	}
	return objectData.props.id
}

export const objectLib = {
	id: (id) => ({
		type: 'id',
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
    constructString: function(string){
        return {
            type: "string",
            props: {
                jsPrimitive: { type: "string", value: string }
            }
        }
    },
    constructArray:function(elements){
        const constructLinkedList = (elements) => {
            const length = elements.length
            if (length === 1){
                return {
                    type:'array',
                    props:{
                        value: elements[0]
                    }
                }
            } else {
                return {
                    type:'array',
                    props:{
                        value: elements[0],
                        nextValue:objectLib.constructArray(elements.slice(1))
                    }
                }
            }
        }


    },
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
                    type: objectLib.constructString('set'),
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
    const hasInverse = attrData.props.hasOwnProperty('inverseAttribute') //if prop has inverse
    const inverseAttr = attrData.props.inverseAttribute
    const parentHash = getHash(objectData)

    const inverse = hasInverse ? { [inverseAttr]: parentHash }: {} //get inverse value (parent)

    const inverseAttrs = Object.assign({ parentValue: parentHash}, inverse)
    const newPropsWithoutHash = Object.assign({}, valueData.props, inverseAttrs)
    const objectDataWithoutHash = Object.assign({}, valueData, { props: newPropsWithoutHash })
    const hash = getHash(objectDataWithoutHash)
    const newProps = Object.assign({},newPropsWithoutHash, {hash})
	const prevVal = null//addState(key, valueWithoutPrevious)
	if (prevVal === null){
		return Object.assign({}, valueData, { props: newProps })
	} else {
		//if (valueData.props.id === "textRepresentation"){console.log('&&&&&&&&&abc', attr, objectData, valueData)}
		return Object.assign({}, valueData, { props: newProps })
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
    //check that hash matches objectData...remove in production
    if (objectData.props.hasOwnProperty('hash') && objectData.props.hash !== getHash(objectData)){
        console.log(objectData, getHash(objectData), objectData.props.hash)
        throw new Error("hashes not equal")
    }

    if (objectData === undefined){
		throw new Error('must have object def for '+prop) //"get rid of this when everything is switched"
	} else if (typeof objectData === "string" && isHash(objectData)){ //needed???
        console.log('stringObjectData')
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
		/*if (objectData.type === 'object'){
			return objectLib.undef
		}*/
		if (!objectData.props.hasOwnProperty('instanceOf')) {
			inheritedData = getObject(state, 'object')
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
            case 'input':{
                const hash = objectData.props.hash
                const name = eval(getJSValue(state, 'placeholder', 'name', objectData).string)
                return {
                    hash,
                    string:'inputs.'+name,
                    args:{name},
                    inline:true
                }
            }
			case 'number': {
				if (valueData.hasOwnProperty('value')) {
					return {
                        hash:objectData.props.hash,
                        string:JSON.stringify(valueData.value),
                        args:{},
                        inline:true,
                        trace:{type:valueData.value, subTraces:[]}
                    }
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'placeholder', 'numericalEquiv', objectData)
					const equivValue = getValue(state, 'placeholder', 'jsPrimitive', equivObjectData)
					return {string:equivValue, args:{}}
				}
			}
			case 'bool': {
				if (valueData.hasOwnProperty('value')) {
					return {
                        hash:objectData.props.hash,
                        string:JSON.stringify(valueData.value),
                        args:{},
                        inline:true,
                        trace:{type:valueData.value, subTraces:[]}
                    }
                } else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'placeholder', 'logicalEquiv', objectData)
					const equivValue = getValue(state, 'equivObject', 'jsPrimitive', equivObjectData)
					return equivValue
				}
			}
			case 'string': {
				if (valueData.hasOwnProperty('value')) {
					return  {
                        hash:objectData.props.hash,
                        string:JSON.stringify(valueData.value),
                        args:{},
                        inline:true,
                        trace:{type:'string', subTraces:[]}
                    }//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!security risk if brackets are allowed in string
				} else {
					//make this so it can search between objects in a set if multiple things are equivalent
					const equivObjectData = getValue(state, 'name', 'stringEquiv', objectData)
					const equivValue = getValue(state, 'equivObject', 'jsPrimitive', equivObjectData)
					return equivValue
				}
			}
            case 'addition':
            case 'subtraction':
            case 'multiplication':
            case 'division':
            case 'equal':
            case 'lessThan':
            case 'greaterThan':
            case 'and':
            case 'or': {
                const symbol = {
                    addition: "+",
                    subtraction: "-",
                    multiplication: "*",
                    division: "/",
                    equal: "===",
                    lessThan: "<",
                    greaterThan: ">",
                    and: "&&",
                    or: "||"
                }
                return {
                    hash: objectData.props.hash,
                    string: symbol[valueData.type],
                    args: {},
                    inline: true
                }
            }
			case 'function': { //can this be combined with apply
                const paramNames = ["result"]
                const parameters = paramNames.map((paramName) => (
                    getJSValue(state, 'placeholder', paramName, objectData)
                ))
                parameters[0].inline = false //refactor
                const foldedPrimitives = foldPrimitive(state, parameters, objectData)
                const childFunctions = foldedPrimitives.hashes
                const variables = foldedPrimitives.variableDefs
                return parameters[0]
                //monad for requiring that function is in table or for placing function in table
			}
			case 'apply': {
                const paramNames = ['op1','function', 'op2']//add support for binary op
                const functionName = objectData.props.function
                let parameters = paramNames.map((paramName) => (
                        getJSValue(state, 'placeholder', paramName, objectData)
                    )).filter((param)=>(param !== undefined))
                const foldedPrimitives = foldPrimitive(state, parameters, objectData)
                const childFunctions = foldedPrimitives.hashes
                const variables = foldedPrimitives.variableDefs
                const subTraces = foldedPrimitives.trace
                if (parameters.length === 3){//binop
                    const programText = childFunctions.join("")
                    return {
                        hash:objectData.props.hash,
                        string:programText,
                        args:foldedPrimitives.arguments,
                        inline:true,
                        trace:{subTraces, type:'apply', vars:['1', 'f', '2']}
                    }
                } else {//unop
                    const functionHash = parameters[1].hash
                    const argString = parameters[0].string
                    return {
                        hash:objectData.props.hash,
                        string:`functionTable.${functionHash}(${argString}, functionTable)`,
                        args:{},
                        inline:true,
                        trace:{subTraces, type:'apply', vars:['1', 'f']}
                    }
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
                const rootObject = getJSValue(state, 'placeholder',"rootObject", objectData)
                const searchArgs = Object.entries(rootObject.args)

                if (searchArgs.length>1){throw 'search args lengthe longer than one'}
                const query = searchArgs[0][1].query
                const getStack = searchArgs[0][1].getStack//this only works for one search. is more than one ever needed in args?
                const hash = objectData.props.hash
                const args = {[hash]:{query, getStack:[...getStack, objectData]}}
                return {
                    hash,
                    string:hash,
                    args,
                    inline:true,
                    trace:{type:'get', args, subTraces:[]}
                }
			}
			case 'search': {//replace this with a call to database?(closer to concept of new)
                const query = def.query
                const hash = objectData.props.hash
                return { hash, string: hash, args: {search:{query, getStack:[]}} }
			}
            case 'recurse':{
                //eventually combine this with search -- local and global?
                const name = eval(getJSValue(state, 'placeholder', 'query', objectData).string)
                const resultHash = getValue(state, 'placeholder', 'result',state.sim.object[name]).props.hash
                return {hash:resultHash, string:resultHash, args:{}}
            }
            case 'ternary': {
                const paramNames = ["condition", "then", "alt"]
                const parameters = paramNames.map((paramName) => (
                    getJSValue(state, 'placeholder', paramName, objectData)
                ))
                const foldedPrimitives = foldPrimitive(state, parameters, objectData)
                const [condition, then, alt] = foldedPrimitives.hashes
                const variables = foldedPrimitives.variableDefs
                const subTraces = foldedPrimitives.trace
                return {
                    hash:objectData.props.hash,
                    string:`(${condition}) ? ${then} : ${alt}`,
                    args:foldedPrimitives.arguments,
                    trace:{subTraces, type:'ternary', vars:['c', 't', 'e']},
                    inline:true
                }
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
                const paramNames = ["x", "y", "innerText", "r", "g", "b"]

                const parameters = paramNames.map((paramName) => (
                    getJSValue(state, 'placeholder', paramName, objectData)
                ))
                const foldedPrimitives = foldPrimitive(state, parameters, objectData)
                const childFunctions = foldedPrimitives.hashes
                const variables = foldedPrimitives.variableDefs
                const subTraces = foldedPrimitives.trace
                const programText = childFunctions.join(",\n\t")
                const string = ` function(prim){//text\n${variables} prim.text(${programText} );}`
				return {
                    hash:objectData.props.hash,
                    string,//this is the rendering function
                    args:Object.assign(foldedPrimitives.arguments,{prim:true}), //combine args of x,y,text
                    inline:false,
                    trace:{subTraces, type:'text', vars:["x", "y", "t", "r", "g", "b"]}
                }
			}
			case 'group':{
				const children = getJSValue(state, 'placeholder', 'childElements', objectData)
				const noUndefChildren = children.filter((child) => (child !== undefined))
                const foldedPrimitives = foldPrimitive(state, noUndefChildren, objectData)
                const childFunctions = foldedPrimitives.hashes
                const variables = foldedPrimitives.variableDefs
                const subTraces = foldedPrimitives.trace

                //need to sort by z-order
                const programText = childFunctions.map((func)=>(func+'(prim)')).join(";\n\t")
				return {
                    hash:objectData.props.hash,
                    string:` function(prim){//group\n${variables} ${programText}}`,
                    args:foldedPrimitives.arguments,
                    trace:{subTraces, type:'group', vars:["1","2"]}
                }
			}
            case 'app':{
                const graphicalRep = getJSValue(state, 'placeholder', 'graphicalRepresentation', objectData)
                const foldedPrimitives = foldPrimitive(state, [graphicalRep], objectData)
                const childFunctions = foldedPrimitives.hashes
                const variables = foldedPrimitives.variableDefs
                const subTraces = foldedPrimitives.trace
                const programText = childFunctions[0]
                return {
                    string:`return function(prim, inputs){//app\n${variables} ${programText}(prim)}`,
                    args: foldedPrimitives.arguments,
                    trace:{subTraces, type:'app', vars:['']}
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
	} else {
        return returnWithPrevValue(name, prop, attrData, valueData, objectData)
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
