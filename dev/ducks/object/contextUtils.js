import { getName, getInverseAttr, getAttr, getNameFromAttr, hasAttribute, getHash, objectFromHash, getValue, objectFromName } from './objectUtils'

export const createParentContext = (state, context, objectData, forwardAttr) => {
    if (typeof context === 'undefined'){
        throw new Error("context undefined")
    }
    const isInverse = isInverseAttr(objectData, forwardAttr, context)
    if (!isInverse){
        //append to context
		const hash =  getHash(objectData)
        const attrData = objectFromName(state, forwardAttr)
        const inverseAttrObject = getValue(state, 'inverseAttribute', attrData, context)
        const inverseAttr = getNameFromAttr(inverseAttrObject)
        const contextElement = {
            debug: `${getNameFromAttr(objectData)}.${forwardAttr} has inverse ${inverseAttr} = ${hash}`,
            attr: inverseAttr,
            value: hash,
            source: "sourceHash" //remove for debug
        }
        console.log( context)
        
        return [[contextElement, ...context[0]], ...(context.slice(1) || [])]
    } else {
        return popInverseFromContext(context)
    }
}
export const getParent = (state, context) => {
    console.log(context)
	return objectFromHash(state, context[0][0].value)
}

export const isInverseAttr = (objectData, attr, context) => {
    return !hasAttribute(objectData, attr) && context[0].length > 1 && context[0][1].attr === attr //check why this is [1] not [0] ...not yet popped?
}

export const popSearchFromContext = (context) => (
    [context[0].slice(1)]
)

export const popInverseFromContext = (context) => (
    [context[0].slice(1)]
)



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
