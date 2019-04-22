import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { objectLib } from './objectLib'
import { primitives } from './primitives'
import { deleteKeys, isUndefined } from './utils'
import { addContextToArgs } from './contextUtils'
import { UNDEFINED } from './constants'


export const objectFromName = (state, name) => {
    const values = Object.values(state)
    const matches = values.filter((obj) => {
        const nameObject = getAttr(obj, 'name')
        if (typeof nameObject === 'undefined') { return false }
        const objName = getAttr(nameObject, 'jsPrimitive').value //try is to replace wrapping this\
        return objName === name
    })
    if (matches.length === 0) {
        throw new Error(`LynxError: object "${name}" not found, ${matches.length}`)
    } else if (matches.length > 1){
        throw new Error(`LynxError: multiple objects named "${name}" found (${matches.length})`)
    }
    return matches[0]
}

export const getAttr = (objectData, attr) => (
    objectData[attr]
)

export const hasAttribute = (objectData, prop) => (
    objectData.hasOwnProperty(prop)
)

export const getName = (state, objectData) => {
    const namePrimitive = getJSValue(state, 'placeholder', "name", objectData)
    return namePrimitive === undefined ? null : namePrimitive.value//switch to comparing hashes?
}

export const objectFromHash = (state, hash) => {
    const value = state[hash]
    if (typeof value === 'undefined'){
        throw new Error("could not find object named "+JSON.stringify(hash))
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
    const jsPrim = getAttr(objectData, 'jsPrimitive')
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
    if (typeof subTree === 'string' || prop === 'jsPrimitive'){ //move this check to get Hash eventually
        return Object.assign({}, hashData, { [prop]: subTree })
    } else {
        return Object.assign({}, hashData, { [prop]: getHash(subTree) })
    }
}

export const getHash = (objectData) => { //this should check that all children are hashes before hashing ie not hashing the whole tree
    //remove these attrs before hashing
    const exemptProps = ["hash", "parentValue"]
    const expandedHashData = deleteKeys(objectData, exemptProps)
    //convert remaining values to hashes
    const hashData = Object.entries(expandedHashData).reduce(objectValuesToHash, {})
    const name = hasAttribute(objectData, 'jsPrimitive') ? getAttr(objectData, 'jsPrimitive').type : ''
    const digest = "$hash_"+name+'_'+ murmurhash.v3(JSON.stringify(hashData))
    //if(objectData.id === 'app'){ //use for debugging
        //console.log(digest, JSON.stringify(objectData, null, 2))
    //}
	return digest
}

const returnWithHash = (state, attr, attrData, valueData) => {
    //adds hash
    const hash = getHash(valueData)
    const newProps = Object.assign({}, valueData, { hash }) //only calculate hash in first state transform
    return newProps
}

export const getValue = (state, prop, objectData) => {
    checkObjectData(state, objectData)
	let def = getAttr(objectData, prop)
    if (typeof def === "string" && isHash(def)){
        def = objectFromHash(state, def)
    }
    const attrData = typeof prop === 'string' ? objectFromName(state, prop) : prop //pass prop data in
	if (def === undefined && prop !== 'attributes'){ //refactor //shim for inherited values //remove with new inheritance pattern?
		const isInstance = hasAttribute(objectData, 'instanceOf')
        const inheritedData = isInstance
            ? getValue(state, 'instanceOf', objectData)
            : objectFromName(state, 'object')
        def = getAttr(inheritedData, prop)
	}
	const valueData = typeof def === 'string' ? objectFromName(state, def) : def
	if (objectData === undefined) {
		throw new Error(`object data undefined for ${prop} ObjectData: ${objectData}`)
	} else if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
        //console.log('getting attributes', objectData)
		if (hasAttribute(objectData, 'attributes')){
			return returnWithHash(state, prop, attrData, valueData)
		} else {
			let attrs = Object.keys(objectData)
			attrs.unshift('prevVal')
			attrs.unshift('attributes')
			const attrSet = objectLib.constructArray(`${getAttr(objectData, 'hash')}Attrs`, attrs)//switch to set
			return returnWithHash(state, prop,attrData, attrSet)
		}
	} else if (def === undefined) {
		//throw new Error(`def is undefined for ${prop} of ${name}`)
		//console.warn(`def is undefined for ${prop} of ${name}`)
		return objectLib.undef
	} else if (prop === 'jsPrimitive') { // primitive objects
        if (primitives.hasOwnProperty(valueData.type)){
            //console.log(`getting ${valueData.type} subtree named ${name}`)
            return primitives[valueData.type](state, objectData, valueData)
        } else {
            throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
        }
	} else {
        return returnWithHash(state, prop, attrData, valueData)
	}
}

const checkObjectData = (state, objectData) => {
    if (objectData === undefined) {
        throw new Error('Lynx Error: objectData is undefined')
    } else if (hasAttribute(objectData, 'hash') && getAttr(objectData, 'hash') !== getHash(objectData)){
        //console.log('objectData', objectData)
        throw new Error("hashes not equal")
	} else if (typeof objectData === "string" && isHash(objectData)){ //needed???
        throw 'string hash'
    }
}

//getJSValue should always return an ast?
export const getJSValue = (state, name, prop, objectData) => {
	const valueData = getValue(state, prop, objectData)
	if (isUndefined(valueData)){
		return undefined
	} else {
		const primitive = getValue(state , 'jsPrimitive', valueData) //get Value of jsPrimitive works
        if (isUndefined(primitive)){
            return primitive //switch to array for child elements so none are undefined
        } else {
            const primitiveWithContext = addContextToArgs(state, prop, primitive, objectData)
            return primitiveWithContext
        }

	}
}
