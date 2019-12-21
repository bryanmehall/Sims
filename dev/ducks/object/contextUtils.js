import { getName, getInverseAttr, getAttr, getNameFromAttr, hasAttribute, getHash, objectFromHash, getValue, objectFromName } from './objectUtils'
const traceContext = false

export const createParentContext = (state, context, objectData, forwardAttr) => { //rename to addContextElement
    if (typeof context === 'undefined'){
        throw new Error("context undefined")
    }
    const isInverse = isInverseAttr(objectData, forwardAttr, context)
    const attrData = objectFromName(state, forwardAttr)
    const inverseAttrObject = getValue(state, 'inverseAttribute', attrData, context)
    const inverseAttr = getNameFromAttr(inverseAttrObject)
    if (isInverse){
		console.warn('here', attrData, context, attrData)
		throw new Error('get trace')
        return popInverseFromContext(context, inverseAttr)
    } else {
        const hash =  getHash(objectData)
        const contextElement = {
            debug: `${getNameFromAttr(objectData)}.${forwardAttr} has inverse ${inverseAttr} = ${hash}`,
            attr: inverseAttr,
            value: hash,
            source: "sourceHash" //remove for debug
        }
        const newContext = [[contextElement, ...context[0]], ...(context.slice(1) || [])]
        if(traceContext){
			console.log("adding context element", forwardAttr, newContext)
		}
        return newContext
    }
}
export const getInverseParent = (state, context, attr) => {
	const index = getInverseContextPathIndex(context, attr)
	return objectFromHash(state, context[index][0].value)
}
export const getParent = (state, context) => {
	return objectFromHash(state, context[0][0].value)
}

export const isInverseAttr = (objectData, attr, context) => {
	if (hasAttribute(objectData, attr)){
		return false
	} else {
		return getInverseContextPathIndex(context, attr) !== -1
	}
}

export const getInverseContextPathIndex = (context, attr) => { //returns index of inverse or -1 if no inverse
	//array in the form [-1, -1, 2...] where there should be one match and
	const pathIndices = context.map((contextPath, index) => ((contextPath.length > 0 && contextPath[0].attr === attr) ? index : -1))
	const inverseIndex = pathIndices.filter((index) => (index !== -1))
	if (inverseIndex.length > 1) {
		throw new Error('too many inverses'+ inverseIndex.length)
	} else if (inverseIndex.length === 0) {
		return -1
	} else {
		return inverseIndex[0]
	}
}

export const popSearchFromContext = (context, query) => {
    const newContext = [context[0].slice(1), ...context.slice(1)]
    if (traceContext){ console.log('popping search', query, newContext) }
    return newContext
}

export const popInverseFromContext = (context, attribute) => {
	const inverseIndex = getInverseContextPathIndex(context, attribute)
    const newContext = [...context.slice(0,inverseIndex), context[inverseIndex].slice(1), ...context.slice(inverseIndex)]
    if (traceContext){ console.log('popping inverse', inverseIndex, attribute, newContext) }
    return newContext
}

export const addContextPath = (context) => {
    const newContext = [context[0], context[0], ...context.slice(1)]
    if (traceContext){ console.log('adding contextPath', newContext) }
    return newContext
}



export const addContextToGetStack = (state, context, attr, currentObject, sourceHash) => {
    const hash = getAttr(currentObject, 'hash')
    const searchName = getName(state, currentObject) //remove for debug
    const inverseAttr = getInverseAttr(state, attr)
    const newContext = {
        debug: `${searchName}.${attr} has inverse ${inverseAttr} = ${hash}`,
        attr: inverseAttr,
        value: hash,
        source: sourceHash //remove for debug
    }
    const noUndefContext = typeof context === 'undefined' ? [] : context //remove and check that all args have context
    return noUndefContext.concat(newContext)
}

//add context to each arg of ast
export const addContextToArgs = (state, attr, ast, objectData) => {
    const argsWithContext = Object.entries(ast.args)
        .reduce((args, entry) => {
            const argKey = entry[0]
            const arg = entry[1]
            const context = addContextToGetStack(state, arg.context, attr, objectData, ast.hash)
            const argWithContext = Object.assign({}, arg, { context })
            return Object.assign({}, args, { [argKey]: argWithContext })
        }, {})
    return Object.assign({}, ast, { args: argsWithContext })
}
