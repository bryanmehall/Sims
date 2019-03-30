import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { objectLib } from './objectLib'
import { primitives } from './primitives'
import { deleteKeys } from './utils'
let objectTable = {}

export const objectFromName = (state, name) => {
    const values = Object.values(state)
    const matches = values.filter((obj) => {
        const nameObject = obj.props.name
        if (typeof nameObject === 'undefined'){ return false}
        const objName = nameObject.props.jsPrimitive.value //try is to replace wrapping this\
        return objName === name
    })
    if (matches.length !== 1) {
        console.log(matches, name)
        throw new Error(`object "${name}" not found in debug, ${matches.length}`)
    }
    return matches[0]
}

export const hasAttribute = (objectData, prop) => (
    objectData.props.hasOwnProperty(prop)
)

export const getName = (state, objectData) => {
    const namePrimitive = getJSValue(state, 'placeholder', "name", objectData)
    return namePrimitive === undefined ? null : namePrimitive.value//switch to comparing hashes?
}

export const objectFromHash = (state, hash) => (
    objectTable[hash]
)
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
    objectFromName(state, attr).props.inverseAttribute
)

const isHash = (str) => (str.includes("$hash"))

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
    const exemptProps = ["hash", "parentValue",'id'] //remove these props before hashing
    const expandedHashData = deleteKeys(objectData.props, exemptProps)
    //convert values of props to hashes
    const name = objectData.props.hasOwnProperty('jsPrimitive') ? objectData.props.jsPrimitive.type : ''
    const hashData = Object.entries(expandedHashData).reduce(objectValuesToHash, {})
    const digest = "$hash_"+name+'_'+ murmurhash.v3(JSON.stringify(hashData))
    //if(objectData.id === 'app'){ //use for debugging
        //console.log(digest, JSON.stringify(objectData, null, 2))
    //}
	return digest
}

export const addToObjectTable = (hash, objectData) => {
    objectTable[hash] = objectData
}

export const returnWithContext = (state, attr, attrData, valueData, objectData) => {
    //adds hash and
	if (objectData.type === 'app'){ //special case for root in this case app
        objectData = objectLib.undef
    }
    const hash = getHash(valueData)
    addToObjectTable(hash, valueData)
    const newProps = Object.assign({}, valueData.props, { hash })
    return {
        state: state,
        value: Object.assign({}, valueData, { props: newProps })
    }
}

export const getValue = (state, prop, objectData) => {
    checkObjectData(state, objectData)
	let def = objectData.props[prop]
    if (typeof def === "string" && isHash(def)){
        def = objectFromHash(state, def)
    }
    const attrData = typeof prop === 'string' ? objectFromName(state, prop) : prop //pass prop data in
	if (def === undefined && prop !== 'attributes'){ //refactor //shim for inherited values //remove with new inheritance pattern?
		let inheritedData
		if (!objectData.props.hasOwnProperty('instanceOf')) {
			inheritedData = objectFromName(state, 'object')
		} else {
			inheritedData = getValue(state, 'instanceOf', objectData).value //parent is passed in?
		}
        def = inheritedData.props[prop]
	}
	const valueData = typeof def === 'string' ? objectFromName(state, def) : def
	if (objectData === undefined) {
		console.log('object data undefined for ', prop, 'ObjectData: ', objectData)
		throw new Error()
	} else if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
		if (objectData.props.hasOwnProperty('attributes')){
			return returnWithContext(state, prop, attrData, valueData, objectData)
		} else {
			let attrs = Object.keys(objectData.props)
			attrs.unshift('prevVal')
			attrs.unshift('attributes')
			const attrSet = objectLib.constructArray(`${objectData.props.hash}Attrs`, attrs)//switch to set
			return returnWithContext(state, prop,attrData, attrSet, objectData)
		}
	} else if (def === undefined) {
		//throw new Error(`def is undefined for ${prop} of ${name}`)
		//console.warn(`def is undefined for ${prop} of ${name}`)
		return { state, value: objectLib.undef }
	} else if (prop === 'jsPrimitive') { // primitive objects
        if (primitives.hasOwnProperty(valueData.type)){
            //console.log(`getting ${valueData.type} subtree named ${name}`)
            return { state, value: primitives[valueData.type](state, objectData, valueData) }
        } else {
            throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
        }
	} else {
        return returnWithContext(state, prop, attrData, valueData, objectData)
	}
}

const checkObjectData = (state, objectData) => {
    if (objectData === undefined) {
        throw new Error('Lynx Error: objectData is undefined')
    } else if (objectData.props.hasOwnProperty('hash') && objectData.props.hash !== getHash(objectData)){
        console.log('objectData', objectData)
        console.log(objectData, getHash(objectData), objectData.props.hash)
        throw new Error("hashes not equal")
	} else if (typeof objectData === "string" && isHash(objectData)){ //needed???
        throw 'string hash'
    }
}

//add context to args of ast (wraps output of getJSValue)
export const addContext = (state, prop, primitive, objectData) => {
    const inverseAttr = getInverseAttr(state, prop)
    const contextAttr = typeof inverseAttr === 'undefined' ? 'g' : inverseAttr
    const primitiveArgs = typeof primitive.args === 'undefined' ? {} : primitive.args
    const argsWithContext = Object.entries(primitiveArgs)
    .filter((arg) => arg[0] !== 'prim')
    .reduce((args, arg) => {
        const newContext = {
            debug: `js prim of ${getName(state, objectData)}.${prop} has inverse ${inverseAttr} ${objectData.props.hash}`,
            attr: contextAttr,
            value: objectData.props.hash
        }
        const argWithContext = Object.assign({}, arg[1], {
            newContext: arg.newContext === undefined ? [newContext] : arg.newContext.concat([newContext, {}])
        })
        return Object.assign({}, args, { [arg[0]]: argWithContext })
    }, {})
    if (primitiveArgs.hasOwnProperty('prim')) {
        Object.assign(argsWithContext, { prim: true })
        //get rid of prim when refactoring? it isn't part of the main rendering monad
    }
    const primitiveWithContext = Object.assign({}, primitive, { args: argsWithContext })
    return primitiveWithContext
}

//getJSValue should always return an ast?
export const getJSValue = (state, name, prop, objectData) => {
	const { value: valueData } = getValue(state, prop, objectData)
	if (valueData.type === 'undef'){
		return undefined
	} else {
		const { value: primitive } = getValue(state , 'jsPrimitive', valueData) //get Value of jsPrimitive works
        const primitiveWithContext = addContext(state, prop, primitive, objectData)
        return primitiveWithContext
	}
}
