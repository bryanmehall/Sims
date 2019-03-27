import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { objectLib } from './objectLib'
import { primitives } from './primitives'
import { deleteKeys } from './utils'
let objectTable = {}

export const getObjectTable = () => {
    let tableWithHashes = {} //put hash attribute in the props attribute
    Object.entries(objectTable).forEach((entry) => {
        const newProps = Object.assign({}, entry[1].props, { hash: entry[0] })
        tableWithHashes[entry[0]] = Object.assign({}, entry[1], { props: newProps })
    })
    const appObject = objectFromName('app', tableWithHashes)

    const appWithInverses = Object.assign(appObject, { inverses: {} })
    return Object.assign(objectTable, {[appObject.props.hash]: appWithInverses})
}

export const objectFromName = (name, objectTable) => {
    const values = Object.values(objectTable)
    const matches = values.filter((obj) => {
        const nameObject = obj.props.name
        if (typeof nameObject === 'undefined'){ return false}
        const objName = nameObject.props.jsPrimitive.value //try is to replace wrapping this\
        return objName === name
    })
    if (matches.length !== 1) {
        console.log(matches, name, objectTable)
        throw new Error('object not found in debug')
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

export const returnWithContext = (state, name, attr, attrData, valueData, objectData) => {
    //adds previous value and parent value to props and inverse attributes
	if (objectData.type === 'app'){ //special case for root in this case app
        objectData = objectLib.undef
    }
    const hasInverse = hasAttribute(attrData, 'inverseAttribute') //if prop has inverse
    const inverseAttr = attrData.props.inverseAttribute
    const parentHash = getHash(objectData)
    addToObjectTable(parentHash, objectData)
    const inverse = hasInverse ? { [inverseAttr]: parentHash }: {} //get inverse value (parent)
    const inverseAttrs = Object.assign({}, { parentValue: parentHash }, inverse)
    const newPropsWithoutHash = Object.assign({}, valueData.props, inverseAttrs)
    const objectInverses = Object.assign({ $attr: attr }, valueData.inverses, inverseAttrs)
    const objectDataWithoutHash = Object.assign({}, valueData, { props: newPropsWithoutHash, inverses: objectInverses })
    const hash = getHash(objectDataWithoutHash)
    addToObjectTable(hash, objectDataWithoutHash)
    const newProps = Object.assign({}, newPropsWithoutHash, { hash })

    return {
        state: state,
        value: Object.assign({}, valueData, { props: newProps, inverses: objectInverses })
    }

}
export const objectFromHash = (hash) => (
    objectTable[hash]
)

export const getInverseAttr = (state, attr) => (
    getObject(state, attr).props.inverseAttribute
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
    //remove inverse attributes from data to be hashed

    const inverseAttrs = objectData.inverses || {}
    const inverseKeys = Object.keys(inverseAttrs)
    const exemptProps = ["hash", "parentValue",'id', ...inverseKeys] //remove these props before hashing
    const expandedHashData = deleteKeys(objectData.props, exemptProps)
    //convert values of props to hashes
    const name = objectData.props.hasOwnProperty('jsPrimitive') ? objectData.props.jsPrimitive.type : ''
    const hashData = Object.entries(expandedHashData).reduce(objectValuesToHash, {})
    //if (objectData.type === 'group') { console.log(inverseKeys, JSON.stringify(hashData, null, 2))}
    const digest = "$hash_"+name+'_'+ murmurhash.v3(JSON.stringify(hashData))
    if(objectData.id === 'app'){ //use for debugging
        //console.log(digest, JSON.stringify(objectData, null, 2))
    }
	return digest
}

const objToHashTable = (objectData) => { //get an object in tree form and return a flattened map of hashes to values
    const inverseAttrs = objectData.inverses || {}
    const inverseKeys = Object.keys(inverseAttrs)
    const exemptProps = ["hash", "parentValue", ...inverseKeys]
    const expandedHashData = deleteKeys(objectData.props, exemptProps)
    const hashData = Object.entries(expandedHashData).reduce((hashTable, entry)=>{
        const prop = entry[0]
        const subTree = entry[1]
        if (typeof subTree === 'string' || prop === 'jsPrimitive'){ //move this check to get Hash eventually
            return Object.assign({}, hashData, { [prop]: subTree })
        } else {
            return Object.assign({}, hashData, { [prop]: getHash(subTree) })
        }
    },{})

}
export const addToObjectTable = (hash, objectData) => {
    objectTable[hash] = objectData
}

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

export const getValue = (state, inverseProps, prop, objectData) => {
    checkObjectData(state, objectData, prop)
	let def = objectData.props[prop]
    if (inverseProps !== 'placeholder'){
        const newProps = Object.assign({},def.props, inverseProps)
        const defInverses = def.inverses || {}
        const newInverses = Object.assign({}, defInverses, inverseProps)
        def = Object.assign(def, { props: newProps, inverses: newInverses })
    } else if (typeof def === "string" && isHash(def)){
        def = objectFromHash(def)
    }
    const attrData = typeof prop === 'string' ? getObject(state, prop) : prop //pass prop data in
	if (def === undefined && prop !== 'attributes'){ //refactor //shim for inherited values //remove with new inheritance pattern?
		let inheritedData

		if (!objectData.props.hasOwnProperty('instanceOf')) {
			inheritedData = getObject(state, 'object')
		} else {
			inheritedData = getValue(state, 'placeholder', 'instanceOf', objectData).value //parent is passed in?
		}
        def = inheritedData.props[prop]
	}
	const valueData = typeof def === 'string' ? getObject(state, def) : def//consequences of making async?
	let name = objectData.props.id
	if (objectData === undefined) {
		console.log('object data undefined for ', name, prop, 'ObjectData: ', objectData)
		throw new Error()
	} else if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
		if (objectData.props.hasOwnProperty('attributes')){
			//const attributeData = objectLib.union(valueData, objectLib)
			return returnWithContext(state, name, prop,attrData, valueData, objectData)
		} else {
			let attrs = Object.keys(objectData.props)
			attrs.unshift('prevVal')
			attrs.unshift('attributes')
			const attrSet = objectLib.constructArray(`${objectData.props.id}Attrs`, attrs)//switch to set
            if (name === 'app'){ console.log(attrSet) }
			return returnWithContext(state, name, prop,attrData, attrSet, objectData)
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
        return returnWithContext(state, name, prop, attrData, valueData, objectData)
	}
}

const checkObjectData = (state, objectData, prop) => {
    if (objectData === undefined) {
        throw new Error('Lynx Error: objectData is undefined')
    } else if (objectData.props.hasOwnProperty('hash') && objectData.props.hash !== getHash(objectData)){
        console.log('objectData', objectData)
        console.log(objectData, getHash(objectData), objectData.props.hash)
        throw new Error("hashes not equal")
    } else if (objectData === undefined){
		throw new Error('must have object def for '+prop)
	} else if (typeof objectData === "string" && isHash(objectData)){ //needed???
        throw 'string hash'
        console.log('stringObjectData')
        objectData = objectFromHash(objectData)
    }
}

//getJSValue should always return an ast?
export const getJSValue = (state, name, prop, objectData) => {
	const { value: valueData } = getValue(state, 'placeholder', prop, objectData)
	if (valueData.type === 'undef'){
		return undefined
	} else {
		const { value: primitive } = getValue(state, 'placeholder' , 'jsPrimitive', valueData) //get Value of jsPrimitive works
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
                    newContext: arg.newContext === undefined ? [newContext] : arg.newContext.concat(newContext)
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
}
