import { getName, getInverseAttr, getAttr, getNameFromAttr, hasAttribute, getHash, objectFromHash, objectFromName } from './objectUtils'

export const createParentContext = (objectTable, context, objectData, forwardAttr) => {
    if (typeof context === 'undefined'){
        throw new Error("context undefined")
    }
    const hash =  getHash(objectData)
    const inverseAttr = getAttr(objectFromName(objectTable, forwardAttr), 'inverseAttribute') || "parentValue"
    //const valueName = getName(objectTable, hash)
    const contextElement = {
        debug: `${getNameFromAttr(objectData)}.${forwardAttr} has inverse ${inverseAttr} = ${hash}`,
        attr: inverseAttr,
        value: hash,
        source: "sourceHash" //remove for debug
    }
    
    return [[contextElement, ...(context[0] || [])], ...context.slice(1)]
}

export const addContextPath = (context) => {
    return [context[0], context[0], ...context.slice(1)] //duplicate first context path (this should have a better scheme to save memory instead of dupliating the whole stack)
}
export const popFromContext = (context) => {
    return [context[0].slice(1), ...context.slice(1)] //remove one element from context[0]
}

export const popInverseFromContext = (context) => {
    return [context[0].slice(1), ...context.slice(1)]
}

export const attributeIsInverse = (rootValue, attribute, context) => {
    return !hasAttribute(rootValue, attribute) && context[0].length > 1 && context[0][1].attr === attribute;
}

export const getParent = (state, context) => {
	return objectFromHash(state, context[0][0].value)
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
