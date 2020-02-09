import { objectLib } from './objectLib'
import { 
    addContextElement, 
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
import { primitiveOps } from './primitiveOps'
import { GET_HASH, NAME, INVERSE_ATTRIBUTE, JS_REP, traceState } from './constants'
import { isUndefined, logOutputs } from './utils'

let filterNamesMemo = {}
const filterNames = (state, name) => {
    if (filterNamesMemo.hasOwnProperty(name)){
        return filterNamesMemo[name]
    }
    const values = Object.entries(state)
    const matches = values.filter((entry) => {
        const obj = entry[1]
        const objName = getNameFromAttr(obj)
        return objName === name
    })
    filterNamesMemo[name] = matches
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
    objectData.hasOwnProperty(prop) || prop === 'arrayElement' || prop === 'previousState' //exclude array element because getting array fakes that attr arrayElement exists
)

export const getNameFromAttr = (objectData) => {
    if (typeof objectData === 'undefined'){
        return 'undef'
    }
    const nameObject = getAttr(objectData, NAME)
    if (typeof nameObject === 'undefined'){
        return 'unnamed'
    } else {
        return getAttr(nameObject, 'jsRep')
    }

}

export const getInverseAttr = (state, attr) => (
    getAttr(objectFromName(state, attr), INVERSE_ATTRIBUTE)
)

export const getPrimitiveType = () => {
    throw new Error('lynx refactor: remove condition')
}

const isGet = (object) => (object !== undefined && (getAttr(object, 'instanceOf') === GET_HASH || getAttr(object, 'instanceOf') === 'get'))

const isLocalSearch = (object) => (getAttr(object, 'initialObjectType') === "localSearch")
const getSearchQuery = (object) => (object.query.jsRep)

const getInheritedName = (state, value, context) => { //FIXME: get rid of name inheritance?
    const forwardAttr = context[0][0].forwardAttr //if a value is getting caught here check that it has a forward attr in hasAttribute
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
    const query = getSearchQuery(searchObject)
    if (context === undefined){
        throw new Error('context undefined')
    } else if (context[0].length === 0){
        throw new Error(`unable to find object named ${query}`)
    }
    const value = getParent(state, context)
    const name = getInheritedName(state, value, context)
    // eslint-disable-next-line no-console
    if (traceGet) { console.log(`query: ${query} name:${name}`, value) }
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
    const attribute = getAttr(getObject, 'attribute')
  //root is a structure containing the value and the context
    if (isLocalSearch(rootObject)){
        const newContext = addContextPath(context)
        const searchObject = getAttr(getObject, "rootObject")
        var root = evaluateSearch(state, searchObject, newContext)
    } else if (isGet(rootObject)){
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
    let context = []//addContextElement(state, oldContext, objectData, prop, def)
    if (typeof def === "string" && isHash(def)){ //REFACTOR: move this if else block to a new function
        def = objectFromHash(state, def)
        context = addContextElement(state, oldContext, objectData, prop, def)
    } else if (typeof prop !== 'string'){ //REFACTOR: clean up this condition
        const array = getValueAndContext(state, 'jsRep', objectData, oldContext) //this context includes js rep so use old context?
        //console.log(array)
        const index = getPath(state, ['equalTo', 'jsRep'], prop, oldContext)
        def = array.value[index.value]
        context = addArrayElementToContext(state, oldContext, objectData, def, prop)
    } else if (def === undefined && prop !== 'attributes' && prop !== "inverseAttribute"){ //refactor //shim for inherited values //remove with new inheritance pattern?
        const isInstance = hasAttribute(objectData, 'instanceOf')
        if (isInstance) {
            const ctx = addContextElement(state, oldContext, objectData, prop, def)
            const inherited = getValueAndContext(state, 'instanceOf', objectData, ctx) //old context here because addContextElement pops off stack
            var inheritedData = inherited.value
            context = inherited.context
        } else {
            inheritedData = objectFromName(state, 'object')
            context = addContextElement(state, oldContext, objectData, prop, def)
        }
		//add group to context here
        def = getAttr(inheritedData, prop)
    } else if (def === undefined) {
		throw new Error(`def is undefined for ${prop} of ${name}`)
    } else {
        context = addContextElement(state, oldContext, objectData, prop, def)
    }
    const valueData = typeof def === 'string' && prop !== JS_REP ? objectFromName(state, def) : def //condition for jsRep that are strings
    if (prop === "previousState") {
        const prevState = getPreviousState(state, objectData, context)
        return prevState
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
    } else if (isGet(valueData)){ //directly evaluate get instead of leaving reference as argument
        return evaluateReference(state, valueData, context) 
    } else if (isLocalSearch(valueData)){
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

const evaluatePrimitive = (state, jsRepValue, objectData, context) => { //allow this to return curried functions
    const argsList = jsRepValue.args || []
    if (jsRepValue.type === "conditional"){ //conditions need to be lazily evaluated for recursive defs
        const conditionSVC = getValueAndContext(state, 'op1', objectData, context)
        const returnValueSVC = conditionSVC.value ? getValueAndContext(state, 'op2', objectData, context) : getValueAndContext(state, 'op3', objectData, context)
        const newState = combineOutputs(conditionSVC.state, returnValueSVC.state)
        return { context, value: returnValueSVC.value, state: newState }
    } else if (state.hasOwnProperty('inputs') && state.inputs.hasOwnProperty(jsRepValue.type)) { 
        return { context, value: state.inputs[jsRepValue.type], state }
    } else if (argsList.length === 0){ //test for primitive needs to be cleaner
        return { context, value: jsRepValue, state }
    } else {
        const argsAndState = argsList.reduce((argsAndState, argName) => { //combine states for each argument
            const argSVC = getValueAndContext(state, argName, objectData, context)
            const combinedState = combineOutputs(argsAndState.state, argSVC.state)
            return { state: combinedState, args: [...argsAndState.args, argSVC.value] }
        }, { state: state, args: [] })
        
        const args = argsAndState.args
        return { context, value: primitiveOps[jsRepValue.type].apply(null, args), state: argsAndState.state }
    }
}

const combineOutputs = (oldState, newState) => ( //BUG: make this combine hash tables too
    Object.assign({}, oldState, { outputs: Object.assign({}, oldState.outputs, newState.outputs) })
)


const getPreviousState = (state, nextValue, context) => { //Should this be in the modifiers section of getValue? 
    //EXPLORE: how to make this only keep track of the previous state of JS rep
    const key = getHash(getAttr(nextValue, "definition"))
    // eslint-disable-next-line no-console
    
    //if (traceState(key)) { console.log('getting previous state', state.inputs) }
    //console.log('assigning inputs', state.inputs)
    const newOutputs = Object.assign({}, state.outputs, { [key]: { value: nextValue, context: context, state, hook: "state" } })
    if (state.inputs.hasOwnProperty(key)){ //update output and get value from input
        const input = state.inputs[key]
        const value = input.value
        const newState = Object.assign({}, input.state, { outputs: newOutputs }) //BUG? use new hashTable?
        // eslint-disable-next-line no-console
        if (traceState(key)) { logOutputs(newOutputs) } //BUG: this is overwriting the previous output so it is resetting to default every time?
        return { context: input.context, value, state: newState } //BUG: this state includes the old outputs ---need to merge
    } else { //add current value to outputs and return default value
        // eslint-disable-next-line no-console
        //if (traceState(key)) { console.log("prev. state is undefined adding", key, nextValue) }
        const defaultValue = nextValue.defaultState
        if (defaultValue === undefined) {
            throw new Error(`LynxError: must provide a default state for ${JSON.stringify(nextValue)}`)
        }
        const newState = Object.assign({}, state, { outputs: newOutputs })
        return { context, value: defaultValue, state: newState }
    }
}

export const getPath = (state, propList, initialObject, initialContext) => (
    propList.reduce(({ value, context, state }, attr) => (
        getValueAndContext(state, attr, value, context)
    ), { value: initialObject, context: initialContext, state })
)


const checkObjectData = (objectData) => {
    if (objectData === undefined) {
        throw new Error('Lynx Error: objectData is undefined')
    } 
}