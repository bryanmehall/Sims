import { getName, getInverseAttr, getAttr, getNameFromAttr, hasAttribute } from './objectUtils'

export const createParentContext = (context, objectData, forwardAttr) => { //make this accept and return context
    if (typeof context === 'undefined'){
        throw new Error("context undefined")
    }
    /*if (context.length> 0){
        console.log(!hasAttribute(objectData, forwardAttr), context[0].attr, forwardAttr)
    }*/
    const isInverse = !hasAttribute(objectData, forwardAttr) && context.length > 0 && context[0].attr === forwardAttr
    if (!isInverse){
        //append to context
        const contextElement = {
            debug: `${getNameFromAttr(objectData)}.${forwardAttr} has inverse ${"parentValue"} = ${getAttr(objectData, 'hash')}`,
            attr: "parentValue",
            value: getAttr(objectData, 'hash'),
            source: "sourceHash" //remove for debug
        }
        return [contextElement, ...context]
    } else {
        console.warn(context, objectData, forwardAttr)

    }
}
export const getParent = (state, context) => (state[context[0].value])

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
