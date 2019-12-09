import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { objectLib } from './objectLib'
import { primitives } from './primitives'
import { deleteKeys, isUndefined } from './utils'
import { addContextToArgs, createParentContext, getParent, isInverseAttr, popSearchFromContext, popInverseFromContext } from './contextUtils'
import { INTERMEDIATE_REP } from './constants'

const filterNames = (state, name) => {
    const values = Object.values(state)
    const matches = values.filter((obj) => {
        const nameObject = getAttr(obj, 'name')
        if (typeof nameObject === 'undefined') { return false }
        const objName = getAttr(nameObject, INTERMEDIATE_REP).value //try is to replace wrapping this
        return objName === name
    })
    return matches
}

export const objectFromName = (state, name) => {
    const matches = filterNames(state, name)
    if (matches.length === 0) {
        throw new Error(`LynxError: object "${name}" not found, ${matches.length}`)

    } else if (matches.length > 1){
        throw new Error(`LynxError: multiple objects named "${name}" found (${matches.length})`)
    }
    return matches[0]
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

export const getAttr = (objectData, attr) => (
    objectData[attr]
)

export const hasAttribute = (objectData, prop) => (
    objectData.hasOwnProperty(prop)
)

export const getName = (state, objectData) => {
    const namePrimitive = getJSValue(state, "name", objectData)
    return namePrimitive === undefined ? null : namePrimitive.value//switch to comparing hashes?
}
export const getNameFromAttr = (objectData) => {
    if (typeof objectData === 'undefined'){
        return 'undef'
    }
    const nameObject = getAttr(objectData, 'name')
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
    const exemptProps = ["hash", "parentValue"] //definition should not be an exempt prop---this is just to get around the hashes not equal error temporarily
    const expandedHashData = deleteKeys(objectData, exemptProps)
    //convert remaining values to hashes
    //console.log(expandedHashData)
    const hashData = Object.entries(expandedHashData).reduce(objectValuesToHash, {})
    //console.log(objectData)

    const name = getNameFromAttr(objectData)//hasAttribute(objectData, INTERMEDIATE_REP) ? getAttr(objectData, INTERMEDIATE_REP).type : ''
    const digest = "$hash_"+name+'_'+ murmurhash.v3(JSON.stringify(hashData))
    //if(objectData.id === 'app'){ //use for debugging
        //console.log(digest, JSON.stringify(objectData, null, 2))
    //}
	return digest
}

const returnWithHash = (attr, attrData, valueData) => {
    //adds hash
    const hash = getHash(valueData)
    const newProps = Object.assign({}, valueData, { hash }) //only calculate hash in first state transform
    return newProps
}

const compile = (state, valueData, objectData, context) => { //move to primitives?
    if (primitives.hasOwnProperty(valueData.type)){
        return primitives[valueData.type](state, objectData, valueData, context)
    } else {
        throw new Error(`LynxError:unknown type. definition: ${JSON.stringify(valueData)}`)
    }
}

const evaluateSearch = (state, def, context) => { //evaluate search component of reference

    const query = getAttr(getAttr(def, "rootObject"), "lynxIR").query
    if (context === undefined){
        throw new Error('context undefined')
    } else if (context[0].length === 0){
        throw new Error(`unable to find object named ${query}`)
    }
    const value = getParent(state, context)
    const name = getNameFromAttr(value)
    const newContext = popSearchFromContext(context)
    if (name === query){
        return {context: newContext, value}
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
	//root is a structure containing the value and the context
    let root
    if (rootType === 'search'){
        root = evaluateSearch(state, getObject, context)
        //add new context path here
    } else if (rootType  === 'get'){
        root = evaluateReference(state, rootObject, context)
    } else {
        root = { context, value: rootObject }
    }
    const rootValue = root.value
    const isInverse = isInverseAttr(rootValue, attribute, context)
    if (isInverse){
        const newContext = popInverseFromContext(context)
        return { context: newContext , value: getParent(state, newContext) }
    } else {
		context = createParentContext(state, root.context, rootValue, attribute)
        const result = getValue(state, attribute, rootValue, context)
        delete result.hash //remove hash because we are going to add definition to it
        const resultWithDefinition = { ...result, definition: getObject }
        addObjectToTable(state, resultWithDefinition)
        return { context, value: resultWithDefinition }
    }
}

export const getValue = (state, prop, objectData, context, getFirst) => { //getFirst is a bool for directly evaluating get nodes
    getFirst = getFirst === undefined ? true : getFirst
    checkObjectData(objectData)
	let def = getAttr(objectData, prop)
    //console.log('getting', prop, def, context)
    if (typeof def === "string" && isHash(def)){
        def = objectFromHash(state, def)
    }
    const attrData = typeof prop === 'string' ? objectFromName(state, prop) : prop //pass prop data in
	if (def === undefined && prop !== 'attributes'){ //refactor //shim for inherited values //remove with new inheritance pattern?
		const isInstance = hasAttribute(objectData, 'instanceOf')
        const inheritedData = isInstance
            ? getValue(state, 'instanceOf', objectData, context) //old context here because createParentContext pops off stack ---is this in need of deeper refactoring?
            : objectFromName(state, 'object')
        def = getAttr(inheritedData, prop)
	}
	const valueData = typeof def === 'string' ? objectFromName(state, def) : def
	if (objectData === undefined) {
		throw new Error(`object data undefined for ${prop} ObjectData: ${objectData}`)
	} else if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
        //console.log('getting attributes', objectData)
		if (hasAttribute(objectData, 'attributes')){
			return returnWithHash(prop, attrData, valueData)
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
			return returnWithHash(prop,attrData, attrSet)
		}
	} else if (def === undefined) {
		//throw new Error(`def is undefined for ${prop} of ${name}`)
		//console.warn(`def is undefined for ${prop} of ${name}`)
		return objectLib.undef
    } else if (def.instanceOf === 'get' && getFirst){ //directly evaluate get instead of leaving it as a free variable
        const referenceNode = evaluateReference(state, def, context).value
        return referenceNode
	} else if (prop === INTERMEDIATE_REP) { // primitive objects
        return compile(state, valueData, objectData, context)
	} else {
        return returnWithHash(prop, attrData, valueData)
	}
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
    const newContext = createParentContext(state, context, objectData, prop)
	const valueData = getValue(state, prop, objectData, newContext)
	if (isUndefined(valueData)){
		return undefined
	} else {
        //const newContext = createParentContext(context, objectData, INTERMEDIATE_REP)
        //console.log(newContext, context, objectData, prop)
		const primitive = getValue(state, INTERMEDIATE_REP, valueData, newContext)
        if (isUndefined(primitive)){
            return primitive //switch to array for child elements so none are undefined
        } else {
            const primitiveWithContext = addContextToArgs(state, prop, primitive, objectData)
            memoTable[key] = primitiveWithContext
            return primitiveWithContext
        }

	}
}
