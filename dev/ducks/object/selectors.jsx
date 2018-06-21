/* eslint pure/pure: 2 */
import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { primitives } from './primitives'
import { jsCompilers } from './jsCompiler'

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

//build string of function from ast node and add that function to the function table
export const buildFunction = (ast) => {
    if (!jsCompilers.hasOwnProperty(ast.type)){
        throw new Error(`LynxError: compiler does not have type ${ast.type}`)
    }
    const string = jsCompilers[ast.type](ast)

    if (ast.inline){
        return string
    } else {
        const argsList = Object.keys(ast.args).concat('functionTable')
        try {
            const func = string.hasOwnProperty('varDefs') ?
                new Function(argsList, `${string.varDefs} return ${string.returnStatement}`) :
                new Function(argsList, '\t return '+string)
            addToFunctionTable(ast.hash, func)
            if (ast.isFunction){
                return `functionTable.${ast.hash}`
            }
            return `\tfunctionTable.${ast.hash}(${argsList.join(",")})`
        } catch (e) {
            console.log('compiled function syntax error', ast, string)
            throw e
        }
    }

}

const addToFunctionTable = (hash, func) => {
    functionTable[hash] = func
}

export const getName = (state, objectData) => {
    const namePrimitive = getJSValue(state, 'placeholder', "name", objectData)
    return namePrimitive === undefined ? null : namePrimitive.value//switch to comparing hashes?
}
export const getProps = (objectData) => {
    if (objectData.hasOwnProperty('context')){
        return Object.assign(objectData.props, objectData.context)
    } else {
        return objectData.props
    }
}
const deleteKeys = (object, keys) => { //careful, this is a shallow copy... does this matter if just deleting keys?
	const objCopy = Object.assign({}, object)
	keys.forEach((key) => {
		delete objCopy[key]
	})
	return objCopy
}

function reduceGetStack(state, currentObject, searchArgData, searchName){
    //iteratively get the getStack[0] attribute of current object to find the end of the stack
    const { argKey, query, getStack, type } = searchArgData
    limiter(2000000, 400)
    //console.log('name:', searchName, 'query:',query, currentObject, searchArgData)
    if (searchName === query || query === "$this"){ //this is a shim for objects that always match. $ is to prevent accidental matches
        if (getStack.length === 0){
            const jsResult = getValue(state, 'placeholder', 'jsPrimitive', currentObject)
            /*convertToSearchArgs(jsResult.args).map((searchArgData) => {
                console.log('search', searchArgData, currentObject)
                console.log('compiling', searchArgData, reduceGetStack(state, currentObject, searchArgData, searchName ))
            })*/
            if (jsResult.type === 'undef') {
                console.log('adding recursive function', currentObject, searchName)
                return { args: { recursive: searchArgData.argKey }, varDefs: [] }
            } else {
                const variableDefinition = {
                    key: argKey,
                    ast: jsResult,
                    string: jsResult.string,
                    comment: `//${searchName}`
                }
                return { args: jsResult.args, varDefs: [variableDefinition] }
            }
        } else {
            const getObject = getStack[0]
            const newGetStack = getStack.slice(1)
            const attr = getObject.props.attribute//attribute to go to
            const isInverseAttr = currentObject.hasOwnProperty('inverses') ? currentObject.inverses.hasOwnProperty(attr) : false
            if (isInverseAttr){
                //return args to show that this is not a resolved attribute
                return { args: { [argKey]: { query: "$this", getStack: newGetStack } }, varDefs: [] }
            }
            //the next section is for allowing objects referenced by a get to have inverse attributes
            //if getObject has any attributes other than those listed
            //then get inverses to add to nextValue

            const extraAttrs = ['jsPrimitive', 'rootObject', 'attribute', 'parentValue', 'hash']
			const inverseAttributes = deleteKeys(getObject.props, extraAttrs)
            const hasInverses = Object.keys(inverseAttributes).length !== 0
            const inverses = hasInverses ? inverseAttributes : 'placeholder'
            //get the next value with inverses from cross edge attached
            const nextValue = getValue(state, inverses, attr, currentObject) //evaluate attr of currentobject
            const nextJSValue = getValue(state, 'placeholder', 'jsPrimitive', nextValue)
            const nextName = getName(state, nextValue)
            if (nextJSValue.type === 'undef'){ //next value does not have primitive
                const newSearchArgs = { argKey, query, getStack: newGetStack }
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs, searchName)
                //handle case where nextName === query returned...need to move arg to varDef
                const childArgs = argsToVarDefs(state, nextValue, nextValueFunctionData, nextValueFunctionData.args, nextName)
                return childArgs
            } else if (nextJSValue.type === 'dbSearch') {
                const query = getJSValue(state,'placeholder', 'query', nextValue).value
                console.log('search', nextValue, objectTable)
                return {
                    args: { [nextValue.props.hash]: {
                        query,
                        hash: nextValue.props.hash,
                        type: 'dbSearch',
                        getStack: newGetStack,
                        searchContext: currentObject,
                        searchAttr: attr,
                        searchInverses: inverses
                    } },
                    varDefs: [{
                        key: argKey,
                        ast: nextJSValue,
                        comment: ""//`//dbSearch: ${query}`
                    }],
                    removedArgs: [] //get rid of this and related code to remove args
                }//this arg key needs to be removed and a new dbSearch argument needs to be added
            } else if (nextValue.type === 'get') {
                const arg = Object.values(nextJSValue.args).filter((ag) => (ag.hasOwnProperty('query')))
                //debug
                if (arg.length > 1) { //this would mean that a child has more than one argument
                    //console.log('args for ',searchName, arg)
                    throw 'arg length greater than one'
                }
                //end-debug
                const childQuery = arg.length === 0 ? searchName: arg[0].query
                const childGetStack = arg.length === 0 ? [] : arg[0].getStack
                const combinedGetStack = childGetStack.concat(newGetStack)
                const newSearchArgs = { argKey, query: childQuery, getStack: combinedGetStack }
                const currentName = getName(state, currentObject)
                return reduceGetStack(state, currentObject, newSearchArgs, currentName)
            } else {
                const newSearchArgs = { argKey, query, getStack: newGetStack }
                return reduceGetStack(state, nextValue, newSearchArgs, searchName)
            }
        }
    } else {
        if (searchName === 'app'){
            if (searchArgData.type === 'dbSearch'){
                return { args: {}, varDefs: [] }
            }
            console.log(searchArgData)
            console.log(objectTable)
            console.warn(`LynxError: no match found for query "${query}"\n Traceback:`)
        }
        return { args: {}, varDefs: [] }//this just doesn't move any args, it doesn't mean that there are not any
    }
}

/*
convert args in the form {argKey:{query:"query" getStack:[]}}
to searchArgs in the form:[{argKey, query, getStack}]
*/
const convertToSearchArgs = (args) => {
    return Object.entries(args)
        .filter((arg) => (arg[1].hasOwnProperty('query')))
        .map((searchArg) => ({ //unpack from object.entries form
            argKey: searchArg[0],
            query: searchArg[1].query,
            getStack: searchArg[1].getStack
        }))
}

/*
combine arg and varDef movements to create the final args and varDefs
*/
const reduceFunctionData = (functionData, newFunctionData) => {
    //this is reversed so var defs will be in the right order -- is this always true?
    const varDefs = functionData.varDefs.concat(newFunctionData.varDefs)
    const args = Object.assign({}, functionData.args, newFunctionData.args)
    const newVarDefs = newFunctionData.varDefs
    newVarDefs.forEach((newVarDef) => {
        if (newVarDef.hasOwnProperty('key')){
            delete args[newVarDef.key]
        }
    })
    const removedArgs = newFunctionData.removedArgs || []
    removedArgs.forEach((argKey) => {
            delete args[argKey]
    })
    return { args, varDefs }
}

//convert object of arguments to object of unresolved args and list of variable defs
//if an an argument is defined entirely under the current object in the tree then it is considered
//resolved and is added to variableDefs
const argsToVarDefs = (state, objectData, functionData, combinedArgs, searchName) => {
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    let dbVariableDefs = []
    if (searchName === 'app'){
        dbVariableDefs = resolveDBSearches(state, combinedArgs)
        dbVariableDefs.forEach((varDef) => {
            delete combinedArgs[varDef.key]
        })
    }
    const functionDataWithDBDefs = Object.assign({}, functionData, {
        varDefs:functionData.varDefs.concat(dbVariableDefs)
    })
    //remove above and change functionDataWithDBDefs functionData
    const resolvedFunctionData = convertToSearchArgs(combinedArgs)
        .map((searchArgData) => {
            const reduced = reduceGetStack(state, objectData, searchArgData, searchName)
            if (reduced.args.hasOwnProperty('recursive')){ //handle struct primitives
                console.log('recursive', combinedArgs, searchName, getName(state, objectData))
                //throw 'recursive'
            }
            return reduced
        })
        .reduce(reduceFunctionData, functionDataWithDBDefs)
    return resolvedFunctionData
}

export const foldPrimitive = (state, childASTs, objectData) => { //list of child objects in the form [{string:..., args:...}]
    const objectName = getName(state, objectData)
    const combinedArgs = combineArgs(childASTs)//combine arguments of sub functions
    const initialFunctionData = { args: combinedArgs, varDefs: [] } //search args moves resolved defs from args to varDefs
    const { args, varDefs } = argsToVarDefs(state, objectData, initialFunctionData, combinedArgs, objectName)
    const variableDefs = varDefs
    const compiledFunctions = childASTs.map(buildFunction)
    const subTraces = childASTs.map((argPrim) => (
        Object.assign({}, argPrim.trace, { name: objectName })
    ))
    return { childFunctions: compiledFunctions, args, variableDefs, subTraces }
}

let functionTable = {}//only js
let stateTable = {}
let objectTable = {}

export const compile = (state) => {
    const appData = getObject(state, 'app')
    const display = getValue(state, 'app', 'jsPrimitive', appData)
    const appString = jsCompilers.app(display)
    const renderMonad = new Function('functionTable', `${appString}`)//returns a thunk with all of render information enclosed
    return { renderMonad, functionTable, ast: display, objectTable }
}

const resolveDBSearches = (state, combinedArgs) => { //move db searches at app to variable defs
    return Object.values(combinedArgs)
        .filter((arg) => (arg.type === 'dbSearch'))
        .map((arg) => {
            const root = getObject(state, arg.query)
            console.log(root)
            const getStack = arg.getStack
            if (getStack.length > 1) { throw 'get stack length greater than one' }
            const attr = 'result'
            const ast = getJSValue(state, 'placeholder', attr, root)
            ast.inline = false
            ast.isFunction = true
            const str = buildFunction(ast) //get rid of side effects here
            console.log(str, ast)
            console.log(ast.hash, functionTable[ast.hash])
            console.log(arg)
            return {
                key: arg.hash,
                ast,
                string: "",
                comment: `//dbSearch for ${arg.query}`
            }
        })
}
//getJSValue should always return an ast?
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

export const getHash = (objectData) => { //this should check that all children are hashes before hashing ie not hashing the whole tree
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

const returnWithContext = (name, attr, attrData, valueData, objectData) => {
    //adds previous value and parent value to props and inverse attributes
	if (objectData.type === 'app'){ //special case for root in this case app
        objectData = objectLib.undef
    }
    const hasInverse = attrData.props.hasOwnProperty('inverseAttribute') //if prop has inverse
    const inverseAttr = attrData.props.inverseAttribute
    const parentHash = getHash(objectData)
    const inverse = hasInverse ? { [inverseAttr]: parentHash }: {} //get inverse value (parent)
    const inverseAttrs = Object.assign({ parentValue: parentHash }, inverse)
    const newPropsWithoutHash = Object.assign({}, valueData.props, inverseAttrs)
    const objectInverses = Object.assign({}, valueData.inverses, inverseAttrs)
    const objectDataWithoutHash = Object.assign({}, valueData, { props: newPropsWithoutHash, inverses: objectInverses })
    const hash = getHash(objectDataWithoutHash)
    const newProps = Object.assign({}, newPropsWithoutHash, { hash })

	const prevVal = null//addState(key, valueWithoutPrevious)
	if (prevVal === null){
		return Object.assign({}, valueData, { props: newProps, inverses: objectInverses })
	} else {
		//if (valueData.props.id === "textRepresentation"){console.log('&&&&&&&&&abc', attr, objectData, valueData)}
		return Object.assign({}, valueData, { props: newProps, inverses: objectInverses })
	}
}

export const getValue = (state, name, prop, objectData) => { //get Value should be called eval and will need to support async actions eventually
    //sanity checks for objects
    //check that hash matches objectData...remove in production
    if (objectData.props.hasOwnProperty('hash') && objectData.props.hash !== getHash(objectData)){
        console.log(objectData, getHash(objectData), objectData.props.hash)
        throw new Error("hashes not equal")
    } else if (objectData === undefined){
		throw new Error('must have object def for '+prop)
	} else if (typeof objectData === "string" && isHash(objectData)){ //needed???
        throw 'string hash'
        console.log('stringObjectData')
        objectData = objectFromHash(objectData)
    }
	let def = objectData.props[prop]
    if (name !== 'placeholder'){
        const newProps = Object.assign({},def.props, name)
        def = Object.assign(def, { props: newProps })
    /*} else if (def !== undefined && def.type === 'dbSearch'){
        const query = eval(getJSValue(state, 'placeholder', 'query', def).string)
        def = getObject(state, query)*/
    } else if (typeof def === "string" && isHash(def)){
        def = objectFromHash(def)
    }
    const attrData = typeof prop === 'string' ? getObject(state, prop) : prop //pass prop data in
	if (def === undefined && prop !== 'attributes'){ //refactor //shim for inherited values //remove with new inheritance pattern?
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
	} else if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
		if (objectData.props.hasOwnProperty('attributes')){
			const attributeData = objectLib.union(valueData, objectLib)
			return returnWithContext(name, prop,attrData, valueData, objectData)
		} else {
			let attrs = Object.keys(objectData.props)
			attrs.unshift('prevVal')
			attrs.unshift('attributes')
			const attrSet = objectLib.constructArray(`${objectData.props.id}Attrs`, attrs)//use array for now because linked list is simpler than rb-tree or c-trie
            if (name === 'app'){console.log(attrSet)}
			return returnWithContext(name, prop,attrData, attrSet, objectData)
		}
	} else if (def === undefined) {
		//throw new Error(`def is undefined for ${prop} of ${name}`)
		//console.warn(`def is undefined for ${prop} of ${name}`)
		return objectLib.undef
	} else if (prop === 'jsPrimitive') { // primitive objects
        if (primitives.hasOwnProperty(valueData.type)){
            return primitives[valueData.type](state, objectData, valueData)
        } else {
            if (def.hasOwnProperty('type')){
                console.log(def)
                return def
            } else {
                throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
            }
        }
	} else {
        return returnWithContext(name, prop, attrData, valueData, objectData)
	}
}

export const objectLib = {
	id: (id) => ({
		type: 'id',
		props: {
			jsPrimitive: { type: 'id', id }
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
			id: 'search'+query,
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
    constructArray: function(name, elements){
        const length = elements.length
        if (length === 0){
            return {
                type: 'end',
                props: {
                    type: objectLib.constructString("end")
                }
            }
        } else {
            return {
                type: 'array',
                props: {
                    value: elements[0],
                    nextElement: objectLib.constructArray(' ', elements.slice(1))
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
                    name: objectLib.constructString('set'),
					id: id
				}
			}
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

let timer = performance.now()
let counter = 0
const limiter = (timeLimit, countLimit) => {
    const dt = performance.now()-timer
    counter+=1
    if (counter>countLimit){
        throw 'count'
    } else if (dt>timeLimit){
        throw 'timer'
    }
}
