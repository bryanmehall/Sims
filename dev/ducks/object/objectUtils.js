import { objectLib } from './objectLib'
import { 
    createParentContext, 
    getParent, 
    isInverseAttr, 
    popSearchFromContext, 
    popInverseFromContext, 
    addContextPath,
	getInverseParent,
    addArrayElementToContext
    } from './contextUtils'
import {
    objectFromHash,
    isHash,
    getHash
    } from './hashUtils'
import { INTERMEDIATE_REP, GET_HASH, NAME, INVERSE_ATTRIBUTE, JS_REP } from './constants'
import { limiter, isUndefined } from './utils'
import { getOutputFileNames } from 'typescript'

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
    objectData.hasOwnProperty(prop) || prop === 'arrayElement' //exclude array element because getting array fakes that attr arrayElement exists
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

const getInheritedName = (state, value, context) => { //TODO: get rid of name inheritance?
    const forwardAttr = context[0][0].forwardAttr 
    //attr from parent to child testing that child came from parent not supertype of parent
    //break into function
    const isNotInherited = hasAttribute(value, forwardAttr)
    if (isNotInherited){
        return getNameFromAttr(value)
    } else {
         const parentTypeObject = getValue(state, 'instanceOf', value, context)
         return getInheritedName(state, parentTypeObject, context)
    }  
}

const traceGet = false
const evaluateSearch = (state, searchObject, context) => { //evaluate search component of reference
    const query = getAttr(searchObject, "lynxIR").query //TODO: remove lynxIR
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
        return { context: newContext, value, state }
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
        root = { context, value: rootObject, state }
    }
    // eslint-disable-next-line no-console
    if (traceGet) { console.log(`getting: ${attribute}`) }
    const rootValue = root.value
    const isInverse = isInverseAttr(rootValue, attribute, root.context)
    if (isInverse){
        const newContext = popInverseFromContext(root.context, attribute, rootValue)
		const value = getInverseParent(root.state, root.context, attribute, rootValue)
        return { context: newContext , value: value, state: root.state }
    } else {
        const result = getValueAndContext(root.state, attribute, rootValue, root.context)
        delete result.value.hash //remove hash because we are going to add definition to it
        const resultWithDefinition = attribute === 'jsRep' ? result.value : { ...result.value, definition: getObject }
        return { context: result.context, value: resultWithDefinition, state: result.state }
    }
}

export const getValue = (state, prop, objectData, context) => (
	getValueAndContext(state, prop, objectData, context).value
)

export const getValueAndContext = (state, prop, objectData, oldContext) => {
    checkObjectData(objectData)
    //console.log(def, prop, objectData)
    let def = getAttr(objectData, prop)
    let context = []//createParentContext(state, oldContext, objectData, prop, def)
    if (typeof def === "string" && isHash(def)){ //REFACTOR: move this if else block to a new function
        def = objectFromHash(state, def)
        context = createParentContext(state, oldContext, objectData, prop, def)
    } else if (typeof prop !== 'string'){ //REFACTOR: clean up this condition
        const array = getValueAndContext(state, 'jsRep', objectData, oldContext) //this context includes js rep so use old context?
        //console.log(array)
        const index = getPath(state, ['equalTo', 'jsRep'], prop, oldContext)
        def = array.value[index.value]
        context = addArrayElementToContext(state, oldContext, objectData, def, prop)
    } else if (def === undefined && prop !== 'attributes' && prop !== "inverseAttribute"){ //refactor //shim for inherited values //remove with new inheritance pattern?
        const isInstance = hasAttribute(objectData, 'instanceOf')
        if (isInstance) {
            const ctx = createParentContext(state, oldContext, objectData, prop, def)
            const inherited = getValueAndContext(state, 'instanceOf', objectData, ctx) //old context here because createParentContext pops off stack
            var inheritedData = inherited.value
            context = inherited.context
        } else {
            inheritedData = objectFromName(state, 'object')
            context = createParentContext(state, oldContext, objectData, prop, def)
        }
		//add group to context here
        def = getAttr(inheritedData, prop)
    } else if (def === undefined) {
		throw new Error(`def is undefined for ${prop} of ${name}`)
    } else {
        context = createParentContext(state, oldContext, objectData, prop, def)
    }
    const valueData = typeof def === 'string' && prop !== JS_REP ? objectFromName(state, def) : def //condition for jsRep that are strings
    if (prop === "previousState") {
        return getPreviousState(state, objectData, context)
    } else if (prop === 'attributes'){ //shim for objects without explicitly declared attributes
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
			return { context, value: attrSet, state }
		}
    } else if (valueData.instanceOf === GET_HASH || valueData.instanceOf === 'get'){ //directly evaluate get instead of leaving reference as argument
        return evaluateReference(state, valueData, context) 
    } else if (valueData.hasOwnProperty("lynxIR") && valueData.lynxIR.type === 'search'){ //REFACTOR: clean this condition up
        const searchResult = evaluateSearch(state, valueData, context)
        return { value: searchResult.value, context, state: searchResult.state }// searchResult.state } //return the old context so recursive functions have different args
	} else if (prop === JS_REP){
        return evaluatePrimitive(state, valueData, objectData, oldContext) //should this be current context and valueData?
	} else if (valueData === undefined){
        // eslint-disable-next-line no-console
        console.warn(objectData)
        throw new Error(`LynxError: value is undefined for prop "${prop}"`)
    } else {
        return { context, value: valueData, state }
	}
}

const evaluatePrimitive = (state, valueData, objectData, context) => { //allow this to return curried functions
    const jsRepValue = valueData //REFACTOR
    const argsList = jsRepValue.args || []
    if (jsRepValue.type === "conditional"){ //conditions need to be lazily evaluated for recursive defs
        const condition = getValue(state, 'op1', objectData, context)
        const returnValue = condition ? getValue(state, 'op2', objectData, context) : getValue(state, 'op3', objectData, context)
        return { context, value: returnValue, state }
    } else if (state.hasOwnProperty('inputs') && state.inputs.hasOwnProperty(jsRepValue.type)) { 
        return { context, value: state.inputs[jsRepValue.type], state }
    } else if (argsList.length === 0){ //test for primitive needs to be cleaner
        return { context, value: jsRepValue, state }
    } else {
        const argsAndState = argsList.reduce((argsAndState, argName) => {
            const argSVC = getValueAndContext(state, argName, objectData, context)
            const combinedState = combineOutputs(argsAndState.state, argSVC.state)
            return { state: combinedState, args: [...argsAndState.args, argSVC.value] }
        }, { state: state, args: [] })
        const args = argsAndState.args

        return { context, value: primitiveOps[jsRepValue.type].apply(null, args), state: argsAndState.state }
    }
}

const combineOutputs = (oldState, newState) => ( //BUG: make this combine hash tables too
    { ...{}, ...oldState, outputs: { ...{}, ...oldState.outputs, ...newState.outputs } }
)
const traceState = false
const getPreviousState = (state, objectData, context) => {
    //EXPLORE: how to make this only keep track of the previous state of JS rep
    //EXPLORE: should this enter a (previous State context) so that any result that goes through this is the previous state?
    //or should we just include the context which should include the input values at the time? 
    // eslint-disable-next-line no-console
    if (traceState) { console.log('getting previous state of: ', objectData) }
    const key = getHash(getAttr(objectData, "definition"))
    const nextValue = objectData //BUG: jsRep is lazily evaluated so this will be whatever the mouse is later not now
    const newOutputs = Object.assign({}, state.outputs, { [key]: { value: nextValue, context: context, state, hook: "state" } })
    
    if (state.inputs.hasOwnProperty(key)){ //update output and get value from input
        const input = state.inputs[key]
        const value = input.value
        const newState = Object.assign({}, input.state, { outputs: newOutputs }) //BUG? use new hashTable?
        // eslint-disable-next-line no-console
        if (traceState) { console.log('returning', input.state.inputs, value) }
        return { context, value, state: newState } //BUG: this state includes the old outputs ---need to merge
    } else { //add current value to outputs and return default value
        // eslint-disable-next-line no-console
        if (traceState) { console.log("prev. state is undefined adding", key, nextValue) }
        const defaultValue = { jsRep: false, instanceOf: "$hash_bool_4076270995" }
        const newState = Object.assign({}, state, { outputs: newOutputs })
        return { context, value: defaultValue, state: newState }
    }
}

export const getPath = (state, propList, initialObject, initialContext) => (
    propList.reduce(({ value, context, state }, attr) => (
        getValueAndContext(state, attr, value, context)
    ), { value: initialObject, context: initialContext, state })
)
const primitiveOps = { // REFACTOR: move to different file
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

const checkObjectData = (objectData) => {
    if (objectData === undefined) {
        throw new Error('Lynx Error: objectData is undefined')
    } 
}