import { 
    getNameFromAttr, 
    hasAttribute, 
    getValue,
    objectFromName
} from './objectUtils'

import { 
    objectFromHash
} from './hashUtils'
import { INVERSE_ATTRIBUTE } from './constants'

const traceContext = false

export const createParentContext = (state, context, objectData, forwardAttr, valueData) => { //TODO: rename to addContextElement
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
        sourceHash: valueData 
    }
    const newContext = [[contextElement, ...context[0]], ...(context.slice(1) || [])]
    if (traceContext){
        // eslint-disable-next-line no-console
        console.log("adding context element", forwardAttr, inverseAttr, newContext)
    }
    return newContext
}

export const getInverseParent = (state, context, attr) => {
	const index = getInverseContextPathIndex(context, attr)
	return objectFromHash(state, context[index][0].value)
}

export const getParent = (state, context) => (
	objectFromHash(state, context[0][0].value)
)

export const isInverseAttr = (objectData, attr, context) => {
	if (hasAttribute(objectData, attr)){
		return false
	} else {
		return getInverseContextPathIndex(context, attr) !== -1
	}
}

export const addArrayElementToContext = (state, context, arrayObject, elementObject, index) => {
    //TODO: add index to context
    console.log(createParentContext(state, context, arrayObject, 'arrayElement', elementObject))
    return createParentContext(state, context, arrayObject, 'arrayElement', elementObject)
}

export const getInverseContextPathIndex = (context, attr) => { //returns index of inverse or -1 if no inverse
	//array in the form [-1, -1, 2...] where there should be one match and
	const pathIndices = context.map((contextPath, index) => ((contextPath.length > 0 && contextPath[0].attr === attr) ? index : -1))
	const inverseIndex = pathIndices.filter((index) => (index !== -1))
	if (inverseIndex.length > 1) {
        // eslint-disable-next-line no-console
        console.warn(attr, context, pathIndices)
		throw new Error('too many inverses'+ inverseIndex.length)
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

export const popInverseFromContext = (context, attribute) => {
	const inverseIndex = getInverseContextPathIndex(context, attribute)
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