import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { objectLib } from './objectLib'
import { primitives } from './primitives'
import { deleteKeys } from './utils'
let objectTable = {}

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
    const { hash: parentHash, state: state1 } = getHash(state, objectData)
    const inverse = hasInverse ? { [inverseAttr]: parentHash }: {} //get inverse value (parent)
    const inverseAttrs = Object.assign({ parentValue: parentHash }, inverse)
    const newPropsWithoutHash = Object.assign({}, valueData.props, inverseAttrs)
    const objectInverses = Object.assign({}, valueData.inverses, inverseAttrs)
    const objectDataWithoutHash = Object.assign({}, valueData, { props: newPropsWithoutHash, inverses: objectInverses })
    const { hash, state: state2 } = getHash(state1, objectDataWithoutHash)
    const newProps = Object.assign({}, newPropsWithoutHash, { hash })

    return {
        state: state2,
        value: Object.assign({}, valueData, { props: newProps, inverses: objectInverses })
    }

}
const objectFromHash = (hash) => (objectTable[hash])

const isHash = (str) => (str.includes("$hash"))

//helper for converting each attribute to hash
const objectValuesToHash = (hashData, entry) => {
    const prop = entry[0]
    const subTree = entry[1]
    if (typeof subTree === 'string' || prop === 'jsPrimitive'){ //move this check to getHash eventually
        return Object.assign({}, hashData, { [prop]: subTree })
    } else {
        return Object.assign({}, hashData, { [prop]: getHash('remove', subTree).hash })
    }
}

export const getHash = (state, objectData) => { //this should check that all children are hashes before hashing ie not hashing the whole tree
    //remove inverse attributes from data to be hashed
    const inverseAttrs = objectData.inverses || {}
    const inverseKeys = Object.keys(inverseAttrs)
    const expandedHashData = deleteKeys(objectData.props, ["hash", "parentValue", ...inverseKeys])
    //convert values of props to hashes
    const hashData = Object.entries(expandedHashData).reduce(objectValuesToHash, {})
    //if (objectData.type === 'group') { console.log(inverseKeys, JSON.stringify(hashData, null, 2))}
    const digest = "$hash"+murmurhash.v3(JSON.stringify(hashData))
    objectTable[digest] = objectData
	return { state: 'remove', hash: digest }
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
			const attrSet = objectLib.constructArray(`${objectData.props.id}Attrs`, attrs)//use array for now because linked list is simpler than rb-tree or c-trie
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
            if (def.hasOwnProperty('type')){
                return { state, value: def }
            } else {
                throw new Error(`unknown type. definition: ${JSON.stringify(def)}`)
            }
        }
	} else {
        return returnWithContext(state, name, prop, attrData, valueData, objectData)
	}
}

const checkObjectData = (state, objectData, prop) => {
    /*if (state !== getHash(state, objectData).state){
        throw new Error('checking hash modified state')
    }*/
    if (objectData.props.hasOwnProperty('hash') && objectData.props.hash !== getHash(state, objectData).hash){
        console.log('objectData', objectData)
        console.log(objectData, getHash(state, objectData).hash, objectData.props.hash)
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
export const getJSValue = (state, name, prop, objData) => {
	//const objectData = objData === undefined ? getObject(state, name) : objData
	const { value: valueData } = getValue(state, 'placeholder', prop, objData)
    //if (prop === 'subset2'){console.log('gettingJS', name, prop, objData, valueData)}
	//const objectData = getObject(state, value) //replace eval: modify here
	if (valueData.type === 'undef'){
		return undefined
	} else {
		const { value: primitive } = getValue(state, 'placeholder' , 'jsPrimitive', valueData) //get Value of jsPrimitive works
        return primitive
	}
}

