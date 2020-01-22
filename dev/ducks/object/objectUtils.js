import { objectLib } from './objectLib'
import { 
    createParentContext, 
    getParent, 
    isInverseAttr, 
    popSearchFromContext, 
    popInverseFromContext, 
    addContextPath,
	getInverseParent
    } from './contextUtils'
import {
    objectFromHash,
    isHash
    } from './hashUtils'
import { INTERMEDIATE_REP, GET_HASH, NAME, INVERSE_ATTRIBUTE, JS_REP } from './constants'
import { limiter } from './utils'

const filterNames = (state, name) => {
    const values = Object.entries(state)
    const matches = values.filter((entry) => {
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
        //console.warn(matches)
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

export const getAttr = (objectData, attr) => (
    objectData[attr]
)

export const hasAttribute = (objectData, prop) => (
    objectData.hasOwnProperty(prop)
)

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

export const getInverseAttr = (state, attr) => (
    getAttr(objectFromName(state, attr), INVERSE_ATTRIBUTE)
)

export const getPrimitiveType = (objectData) => {
    const jsPrim = getAttr(objectData, INTERMEDIATE_REP)
    if (jsPrim === undefined){
        return undefined
    } else {
        return jsPrim.type
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

const traceGet = false
const evaluateSearch = (state, searchObject, context) => { //evaluate search component of reference
    const query = getAttr(searchObject, "lynxIR").query
    if (context === undefined){
        throw new Error('context undefined')
    } else if (context[0].length === 0){
        throw new Error(`unable to find object named ${query}`)
    }
    const value = getParent(state, context)
    const name = getInheritedName(state, value, context)
    // eslint-disable-next-line no-console
    if (traceGet) { console.log(`query: ${query} name:${name}`) }
    const newContext = popSearchFromContext(context, query)
    if (name === query){
        return { context: newContext, value }
    } else {
        return evaluateSearch(state, searchObject, newContext)
    }
}

const evaluateReference = (state, getObject, context) => { //evaluate whole reference object
    if (typeof context === 'undefined'){
        throw new Error("context undefined")
    }
    const rootObject = getAttr(getObject, 'rootObject')
	const rootType = getPrimitiveType(rootObject)
    const attribute = getAttr(getObject, 'attribute')
  //root is a structure containing the value and the context
    if (rootType === 'search'){
        const newContext = addContextPath(context)
        const searchObject = getAttr(getObject, "rootObject")
        var root = evaluateSearch(state, searchObject, newContext)
    } else if (rootType === 'get'){
        root = evaluateReference(state, rootObject, context)
    } else {
        root = { context, value: rootObject }
    }
    // eslint-disable-next-line no-console
    if (traceGet) { console.log(`getting: ${attribute}`) }
    const rootValue = root.value
    const isInverse = isInverseAttr(rootValue, attribute, root.context)
    if (isInverse){
        const newContext = popInverseFromContext(root.context, attribute)
		const value = getInverseParent(state, root.context, attribute)
        return { context: newContext , value: value }
    } else {
        const result = getValueAndContext(state, attribute, rootValue, root.context)
        delete result.value.hash //remove hash because we are going to add definition to it
        const resultWithDefinition = attribute === 'jsRep' ? result.value : { ...result.value, definition: getObject }
        return { context: result.context, value: resultWithDefinition }//resultWithDefinition }
    }
}

export const getValue = (state, prop, objectData, context) => (
	getValueAndContext(state, prop, objectData, context).value
)

export const getValueAndContext = (state, prop, objectData, oldContext) => {
    
    checkObjectData(objectData)
    //console.log(def, prop, objectData)
    
    let def = getAttr(objectData, prop)
    let context = createParentContext(state, oldContext, objectData, prop, def)
    if (typeof def === "string" && isHash(def)){
        def = objectFromHash(state, def)
    } else if (def === undefined && prop !== 'attributes' && prop !== "inverseAttribute"){ //refactor //shim for inherited values //remove with new inheritance pattern?
        const isInstance = hasAttribute(objectData, 'instanceOf')
        if (isInstance) {
            const inherited = getValueAndContext(state, 'instanceOf', objectData, context) //old context here because createParentContext pops off stack
            var inheritedData = inherited.value
            context = inherited.context
        } else {
            inheritedData = objectFromName(state, 'object')
        }
		//add group to context here
        def = getAttr(inheritedData, prop)
    } else if (def === undefined) {
		throw new Error(`def is undefined for ${prop} of ${name}`)
    }
    
    const valueData = typeof def === 'string' && prop !== JS_REP ? objectFromName(state, def) : def //condition for jsRep that are strings
    if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
        //console.log('getting attributes', objectData)
		if (hasAttribute(objectData, 'attributes')){
			return { context: [], value: valueData }
		} else {
			let attrs = Object.keys(objectData)
			attrs.unshift('prevVal')
			attrs.unshift('attributes')
            const attrObjects = attrs.map((attrName) => ({
                instanceOf: "element",
                elementValue: objectLib.constructString(attrName) //should this be an attribute not just a string of the name?
                 }))
			const attrSet = objectLib.constructArray(`${getAttr(objectData, 'hash')}Attrs`, attrObjects)//switch to set
			return { context, value: attrSet }
		}
    } else if (valueData.instanceOf === GET_HASH || valueData.instanceOf === 'get'){ //directly evaluate get instead of leaving reference as argument
        return evaluateReference(state, valueData, context) 
	} else if (valueData.hasOwnProperty("lynxIR") && valueData.lynxIR.type === 'search'){ //clean this condition up
        const value = evaluateSearch(state, valueData, context).value
        return { value, context } //return the old context so recursive functions have different args
	} else if (prop === JS_REP){
        return evaluatePrimitive(state, valueData, objectData, oldContext) //should this be current context and valueData? 
	} else {
        return { context, value: valueData }
	}
}

const evaluatePrimitive = (state, valueData, objectData, context) => { //allow this to return curried functions
    const jsRepValue = valueData.instanceOf === GET_HASH ? evaluateReference(state, valueData, context).value : valueData //if jsRep is a reference node --refactor by moving get check before jsRep check??
    const argsList = jsRepValue.args || []
    if (jsRepValue.type === "conditional"){ //conditions need to be lazily evaluated for recursive defs
        const condition = getValue(state, 'op1', objectData, context)
        const returnValue = condition ? getValue(state, 'op2', objectData, context) : getValue(state, 'op3', objectData, context)
        return { context, value: returnValue }
    } else if (jsRepValue.type === 'mouseX') {
        return { context, value: inputs['mouseX'] }
    } else if (argsList.length === 0){ //test for primitive needs to be cleaner
        return { context, value: jsRepValue }
    } else {
        const args = argsList.map((argName) => (
            getValue(state, argName, objectData, context)
        ))
        return { context, value: primitiveOps[jsRepValue.type].apply(null, args) }
    }
}

export const getPath = (state, propList, initialObject, initialContext) => (
    propList.reduce(({ value, context }, attr) => (
        getValueAndContext(state, attr, value, context)
    ), { value: initialObject, context: initialContext })
)
const primitiveOps = { // TODO: move to different file
    addition: (op1, op2) => (op1 + op2),
    subtraction: (op1, op2) => (op1 - op2),
    multiplication: (op1, op2) => (op1 * op2),
    division: (op1, op2) => (op1 / op2),
    and: (op1, op2) => (op1 && op2),
    or: (op1, op2) => (op1 || op2),
    not: (op1) => (!op1),
    conditional: (op1, op2, op3) => (op1 ? op2 : op3),
    equal: (op1, op2) => (op1 === op2),
    lessThan: (op1, op2) => (op1 < op2),
    greaterThan: (op1, op2) => (op1 > op2),
    concat: (op1, op2) => (op1 + op2),
    getIndex: (array, index) => (array[index])
}

const inputs= {
    mouseX: 20,
    mouseDown: false
}

const checkObjectData = (objectData) => {
    if (objectData === undefined) {
        throw new Error('Lynx Error: objectData is undefined')
    } 
}