import { 
    getNameFromAttr, 
    hasAttribute, 
    getValue,
    objectFromName
} from './objectUtils'

import { 
    objectFromHash, getHash
} from './hashUtils'
import { INVERSE_ATTRIBUTE } from './constants'
import { deleteKeys } from './utils'

const traceContext = false

export const addContextElement = (state, context, objectData, forwardAttr, valueData) => {
    if (typeof context === 'undefined'){
        throw new Error("context undefined")
    }
    const attrData = objectFromName(state, forwardAttr)
    if (hasAttribute(attrData, INVERSE_ATTRIBUTE)){
        const inverseAttrObject = getValue(state, INVERSE_ATTRIBUTE, attrData, context)
        var inverseAttr = getNameFromAttr(inverseAttrObject)
    } else {
        inverseAttr = 'undef'
    }
    
    const contextElement = {
        debug: `${getNameFromAttr(objectData)}.${forwardAttr} has inverse ${inverseAttr}`,
        forwardAttr: forwardAttr,
        attr: inverseAttr,
        value: objectData,
        source: valueData
    }
    const newContext = [[contextElement, ...context[0]], ...(context.slice(1) || [])]
    if (traceContext){
        // eslint-disable-next-line no-console
        console.log("adding context element", forwardAttr, inverseAttr, newContext)
    }
    return newContext
}

export const getInverseParent = (state, context, attr, sourceData) => {
	const index = getInverseContextPathIndex(context, attr, sourceData)
	return objectFromHash(state, context[index][0].value)
}

export const getParent = (state, context) => (
	objectFromHash(state, context[0][0].value)
)

export const isInverseAttr = (objectData, attr, context) => {
	if (hasAttribute(objectData, attr)){
		return false
	} else {
		return getInverseContextPathIndex(context, attr, objectData) !== -1
	}
}

export const addArrayElementToContext = (state, context, arrayObject, elementObject, indexObject) => {
    const indexElement = {
        debug: `array.element has inverse index`,
        forwardAttr: 'element',
        attr: 'index',
        value: indexObject,
        source: elementObject 
    }
    const indexContext = [context[0], [indexElement], ...context.slice(1)]
    return addContextElement(state, indexContext, arrayObject, 'arrayElement', elementObject)
}

export const getInverseContextPathIndex = (context, attr, sourceData) => { //returns index of inverse or -1 if no inverse
	//array in the form [-1, -1, 2...] where there should be one match and
	const pathIndices = context.map((contextPath, index) => ((contextPath.length > 0 && contextPath[0].attr === attr) ? index : -1))
    const inverseIndex = pathIndices.filter((index) => (index !== -1))
    //TODO: clean up the folowing condition into the previous filter or map?
	if (inverseIndex.length > 1) { //if there are multiple matches then filter to ones with matching source objects
        const sourcees = inverseIndex.map((i) => { // get hash for each element with matching attr
            const objData = context[i][0].source //BUG: should we delete this definition or will this cause subtle bugs?
            return getHash(deleteKeys(objData, ['definition']))
        })
        // eslint-disable-next-line no-console
        const currentObjectHash = getHash(deleteKeys(sourceData,  ['definition']))
        //filter these hashes if they are equal to the sourceData and return their index in the original matches
        const filteredMatches = sourcees.map((hash, i) => (hash === currentObjectHash ? i : -1)) 
            .filter((index) => (index !== -1))
        if (filteredMatches.length === 1) { 
            return inverseIndex[filteredMatches[0]]
        } else {
            throw new Error(`exactly one source must match`)
        }
	} else if (inverseIndex.length === 0) {
		return -1
	} else {
		return inverseIndex[0]
	}
}

export const popSearchFromContext = (context, query) => {
    const newContext = [context[0].slice(1), ...context.slice(1)]
    // eslint-disable-next-line no-console
    if (traceContext){ console.log('popping search', query, newContext) }
    return newContext
}

export const popInverseFromContext = (context, attribute, sourceData) => {
    const inverseIndex = getInverseContextPathIndex(context, attribute, sourceData)
    const newContext = [...context.slice(0,inverseIndex), context[inverseIndex].slice(1), ...context.slice(inverseIndex+1)]
    // eslint-disable-next-line no-console
    if (traceContext){ console.log('popping inverse', inverseIndex, attribute, context, newContext) }
    return newContext
}

export const addContextPath = (context) => {
    const newContext = [context[0], context[0], ...context.slice(1)]
    // eslint-disable-next-line no-console
    if (traceContext){ console.log('adding contextPath', newContext) }
    return newContext
}