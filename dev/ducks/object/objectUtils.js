import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { objectLib } from './objectLib'
import { primitives } from './primitives'
import { deleteKeys, isUndefined } from './utils'
import { 
    addContextToArgs, 
    createParentContext, 
    getParent, 
    isInverseAttr, 
    popSearchFromContext, 
    popInverseFromContext, 
    addContextPath,
	getInverseParent
} from './contextUtils'
import { INTERMEDIATE_REP, GET_HASH, NAME } from './constants'

const filterNames = (state, name) => {
    const values = Object.entries(state)
    const matches = values.filter((entry) => {
        const key = entry[0]
        const obj = entry[1]
        const objName = getNameFromAttr(obj)
        return objName === name
    })
    return matches //matches in the form [hash, value]
}
const checkSearchMatches = (matches, name) => {
    if (matches.length === 0) {
        throw new Error(`LynxError: object "${name}" not found, ${matches.length}`)
    } else if (matches.length > 1){
        console.warn(matches)
        throw new Error(`LynxError: multiple objects named "${name}" found (${matches.length})`)
    }
}
export const objectFromName = (state, name) => {
    const matches = filterNames(state, name)
    checkSearchMatches(matches, name)
    return matches[0][1]
}
export const hashFromName = (state, name) => {
    const matches = filterNames(state, name)
    checkSearchMatches(matches, name)
    return matches[0][0]
}

export const tableContainsName = (hashTable, name) => {
    const matches = filterNames(hashTable, name)
    if (matches.length === 0) {
        return false
    } else if (matches.length === 1){
        return true
    } else {
        throw new Error(`LynxError: multiple objects named "${name}" found (${matches.length})`)
    }
}

export const getAttr = (objectData, attr) => {
    return objectData[attr]
}

export const hasAttribute = (objectData, prop) => (
    objectData.hasOwnProperty(prop)
)

export const getName = (state, objectData) => {
    const namePrimitive = getJSValue(state, NAME, objectData)
    return namePrimitive === undefined ? null : namePrimitive.value//switch to comparing hashes?
}
export const getNameFromAttr = (objectData) => {
    if (typeof objectData === 'undefined'){
        return 'undef'
    }
    const nameObject = getAttr(objectData, NAME)
    if (typeof nameObject === 'undefined'){
        return 'unnamed'
    } else {
        
        return getAttr(nameObject, INTERMEDIATE_REP).value
    }

}

export const objectFromHash = (state, hash) => {
    const value = state[hash]
    if (typeof value === 'undefined'){
        throw new Error(`could not find object named ${JSON.stringify(hash)} in state`)
    } else {
        return value
    }
}
//combine these
export const getObject = function (state, hash) {
	//this should only be a shim for values defined in json
	try {
		return state[hash]
	} catch (e){
		throw new Error("could not find object named "+JSON.stringify(hash))
	}
}

export const getInverseAttr = (state, attr) => (
    getAttr(objectFromName(state, attr), 'inverseAttribute')
)

export const getPrimitiveType = (objectData) => {
    const jsPrim = getAttr(objectData, INTERMEDIATE_REP)
    if (jsPrim === undefined){
        return undefined
    } else {
        return jsPrim.type
    }

}

const isHash = (str) => (
    str.includes("$hash")
)

//helper for converting each attribute to hash
const objectValuesToHash = (hashData, entry) => {
    const prop = entry[0]
    const subTree = entry[1]
    if (typeof subTree === 'string' || prop === INTERMEDIATE_REP){ //move this check to get Hash eventually
        return Object.assign({}, hashData, { [prop]: subTree })
    } else {
        return Object.assign({}, hashData, { [prop]: getHash(subTree) })
    }
}
let hashMemoTable = {}

export const getHash = (objectData) => { //this should check that all children are hashes before hashing ie not hashing the whole tree
    //remove these attrs before hashing
    if (typeof objectData === "string"){
        return "$hash_string_"+ murmurhash.v3(objectData)
    }
    const exemptProps = ["hash", "parentValue"]
    const expandedHashData = deleteKeys(objectData, exemptProps)
    //convert remaining values to hashes
    const hashData = Object.entries(expandedHashData).reduce(objectValuesToHash, {})
    const name = getNameFromAttr(objectData)
    const digest = "$hash_"+name+'_'+ murmurhash.v3(JSON.stringify(hashData))
	return digest
}

const addHashToObject = (attr, attrData, valueData) => {
    //adds hash
    const hash = getHash(valueData)
    const newProps = Object.assign({}, valueData, { hash })
    return newProps
}

const compile = (state, valueData, objectData, context) => { //move to primitives?
    if (primitives.hasOwnProperty(valueData.type)){
        return primitives[valueData.type](state, objectData, valueData, context)
    } else {
        throw new Error(`LynxError:unknown type. definition: ${JSON.stringify(valueData)}`)
    }
}
const getInheritedName = (state, value, context) => {    
    const isNotInherited = hasAttribute(value, context[0][0].forwardAttr)//break into function
    if (isNotInherited){
        return getNameFromAttr(value)
    } else {
         const parentTypeObject = getValue(state, 'instanceOf', value, context)
         return getInheritedName(state, parentTypeObject, context)
    }  
}

const traceGet = true
const evaluateSearch = (state, def, context) => { //evaluate search component of reference
    const query = getAttr(getAttr(def, "rootObject"), "lynxIR").query
    if (context === undefined){
        throw new Error('context undefined')
    } else if (context[0].length === 0){
        throw new Error(`unable to find object named ${query}`)
    }
    const value = getParent(state, context)
    const name = getInheritedName(state, value, context)
    if (traceGet) {console.log(`query: ${query} name:${name}`)}
    const newContext = popSearchFromContext(context, query)
    if (name === query){
        return { context: newContext, value }
    } else {
        return evaluateSearch(state, def, newContext)
    }
}

export const addObjectToTable = (table, objectData) => {
    table[getHash(objectData)] = objectData
}

const evaluateReference = (state, getObject, context) => { //evaluate whole reference object
    if (typeof context === 'undefined'){
        throw new Error("context undefined")
    }
    const rootObject = getAttr(getObject, 'rootObject')
	const rootType = getPrimitiveType(rootObject)
    const attribute = getAttr(getObject, 'attribute')
    let root  //root is a structure containing the value and the context
    if (rootType === 'search'){
        const newContext = addContextPath(context)
        root = evaluateSearch(state, getObject, newContext)
    } else if (rootType === 'get'){
        root = evaluateReference(state, rootObject, context)
    } else {
        root = { context, value: rootObject }
    }
    if (traceGet) {console.log(`getting: ${attribute}`)}
    const rootValue = root.value
    const isInverse = isInverseAttr(rootValue, attribute, root.context)
    if (isInverse){ //is this check duplicated with the check in contextutils?
        const newContext = popInverseFromContext(root.context, attribute)
		const value = getInverseParent(state, root.context, attribute)
		//console.warn(value)
        return { context: newContext , value: value }
    } else {
        
		context = createParentContext(state, root.context, rootValue, hashFromName(state, attribute)) //refactor/rename this block
        const result1 = getValueAndContext(state, attribute, rootValue, context)
        const result = result1.value
        delete result.hash //remove hash because we are going to add definition to it
        const resultWithDefinition = { ...result, definition: getObject }
        addObjectToTable(state, resultWithDefinition)
        return { context:result1.context, value: resultWithDefinition }
    }
}
export const getValue = (state, prop, objectData, context, getFirst) => {
	return getValueAndContext(state, prop, objectData, context, getFirst).value
}
export const getValueAndContext = (state, prop, objectData, context, getFirst) => { //getFirst is a bool for directly evaluating get nodes
    getFirst = getFirst === undefined ? true : getFirst
    checkObjectData(objectData)
	let def = getAttr(objectData, prop)
    //console.log('getting', prop, def, context)
    if (typeof def === "string" && isHash(def)){
        def = objectFromHash(state, def)
    }
    if (def === undefined && prop === 'name'){
        console.warn('here')
    }
    const attrData = typeof prop === 'string' && isHash(prop) ? objectFromHash(state, prop) : 
        typeof prop === 'string' && !isHash(prop) ? objectFromName(state, prop) :
        prop //pass prop data in
	if (def === undefined && prop !== 'attributes' && prop !== "inverseAttribute"){ //refactor //shim for inherited values //remove with new inheritance pattern?
		const isInstance = hasAttribute(objectData, 'instanceOf')
        let inheritedData
        if (isInstance) {
            const inherited = getValueAndContext(state, 'instanceOf', objectData, context) //old context here because createParentContext pops off stack
            inheritedData = inherited.value
            context = inherited.context
        } else {
            inheritedData = objectFromName(state, 'object')
        }
		//add group to context here
        def = getAttr(inheritedData, prop)
    } else if (def === undefined) {
		//throw new Error(`def is undefined for ${prop} of ${name}`)
		//console.warn(`def is undefined for ${prop} of ${name}`)
		return { context, value: objectLib.undef }
    }
    
	const valueData = typeof def === 'string' && prop !== "jsRep" ? objectFromName(state, def) : def //condition for jsRep that are strings
	if (objectData === undefined) { 
		throw new Error(`object data undefined for ${prop} ObjectData: ${objectData}`)
	} else if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
        //console.log('getting attributes', objectData)
		if (hasAttribute(objectData, 'attributes')){
			return { context: [], value: addHashToObject(prop, attrData, valueData) }
		} else {
			let attrs = Object.keys(objectData)
			attrs.unshift('prevVal')
			attrs.unshift('attributes')
            const attrObjects = attrs.map((attrName) => ({
                instanceOf: "element",
                elementValue: objectLib.constructString(attrName) //should this be an attribute not just a string of the name?
                 }))
			const attrSet = objectLib.constructArray(`${getAttr(objectData, 'hash')}Attrs`, attrObjects)//switch to set
            console.log(attrSet)
			return { context, value: addHashToObject(prop,attrData, attrSet) }
		}
	} else if (prop === "jsRep"){
        const jsRepValue = def.instanceOf === GET_HASH ? evaluateReference(state, def, context).value : valueData //if jsRep is a reference node --refactor? 
        const argsList = jsRepValue.type === 'addition' ? ['op1', 'op2'] : []//generalize
        console.log(argsList)
        const args = argsList.map((argName) => (getValue(state, argName, objectData, context).value))
        console.log(jsRepValue)
        if (args.length === 0){ //test for primitive needs to be cleaner
            return { context, value: { value: jsRepValue } }
        } else {
            return { context, value: { value: primitiveOps[jsRepValue.type].apply(null, args) } }
        }
         //get rid of definition for this so it can just be the value not an object? 
    } else if (def.instanceOf === GET_HASH && getFirst){ //directly evaluate get instead of leaving reference as argument
        const referenceNode = evaluateReference(state, def, context)
        return referenceNode
	}  else if (prop === INTERMEDIATE_REP) { // primitive objects
        return { context, value: compile(state, valueData, objectData, context) }
	} else {
        return { context, value: addHashToObject(prop, attrData, valueData) }
	}
}
const primitiveOps = {
    addition: (op1, op2) => (op1 + op2),
    subtraction: (op1, op2) => (op1 - op2),
    multiplication: (op1, op2) => (op1 * op2),
    division: (op1, op2) => (op1 / op2),
    and: (op1, op2) => (op1 && op2),
    or: (op1, op2) => (op1 || op2),
    not: (op1) => (!op1),
    conditional: (op1, op2, op3) => (op1 ? op2 : op3),
    equalTo: (op1, op2) => (op1 === op2),
    lessThan: (op1, op2) => (op1 < op2),
    greaterThan: (op1, op2) => (op1 > op2)
}

const checkObjectData = (objectData) => {
    if (objectData === undefined) {
        throw new Error('Lynx Error: objectData is undefined')
    } else if (hasAttribute(objectData, 'hash') && getAttr(objectData, 'hash') !== getHash(objectData)){
        console.log(JSON.stringify(objectData, null, 2), getAttr(objectData, 'hash'))
        throw new Error("hashes not equal")
	} else if (typeof objectData === "string" && isHash(objectData)){ //needed???
        throw 'string hash'
    }
}

let memoTable = {}
export const resetMemo = () => {
    memoTable = {}
}
export const getJSValue = (state, prop, objectData, context) => {
    const hash = getAttr(objectData, 'hash') || getHash(objectData)
    objectData.hash = hash
    const key = prop + hash
    if (memoTable.hasOwnProperty(key) && hash !== undefined){
        return memoTable[key]
    }
    context = context || [[]]
    const attr = isHash(prop) ? prop : hashFromName(state, prop)
    let newContext = createParentContext(state, context, objectData, attr)
    console.log(prop, objectData)
	const valueAndContext = getValueAndContext(state, prop, objectData, newContext)
	const valueData = valueAndContext.value
	newContext = valueAndContext.context
	if (isUndefined(valueData)){
		return undefined
	} else {
        //const newContext = createParentContext(context, objectData, INTERMEDIATE_REP)
        //console.log(newContext, context, objectData, prop)
		const primitive = getValue(state, INTERMEDIATE_REP, valueData, newContext)
        if (isUndefined(primitive)){
            return primitive //switch to array for child elements so none are undefined
        } else {
            const primitiveWithContext = addContextToArgs(state, attr, primitive, objectData)
            memoTable[key] = primitiveWithContext
            return primitiveWithContext
        }

	}
}
