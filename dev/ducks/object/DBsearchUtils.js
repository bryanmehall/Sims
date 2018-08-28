import { getObject, getHash, getValue, getJSValue } from './objectUtils'
//import { buildFunction } from './IRutils'

export const resolveDBSearches = (state, combinedArgs) => { //move db searches at app to variable defs
    return Object.values(combinedArgs)
        .filter((arg) => {
            return arg.type === 'dbSearch' || arg.type === 'globalGet' //combine these conditions
        })
        .map((arg) => {
            let root = getObject(state, arg.query)
            //root.props.parentValue = 'parent' //this prop must be set before the hash prop to keep the order of props consistent
            root.props.hash = getHash(state, root).hash //formalize what hash means so it is consistent
            const rootProps = Object.assign({}, root.props, arg.searchContext)
            root = Object.assign({}, root, {
                props: rootProps,
                inverses: arg.searchContext
            })
            const getStack = arg.getStack
            if (getStack.length > 1) { throw 'get stack length greater than one' }
            let ast
            if (getStack.length === 0){ //generalize for getStack of length n
                ast = getValue(state, 'placeholder', 'jsPrimitive', root).value
                console.log('root', root, ast)
            } else {
                const attr = getStack[0].props.attribute
                ast = getJSValue(state, 'placeholder', attr, root)
            }
            ast.inline = false
            ast.isFunction = true
            //const str = buildFunction(ast).string
            console.log(arg)
            return {
                key: arg.hash,
                ast,
                string: "",
                comment: `//dbSearch for ${arg.query}`
            }
        })
}

export const getDBsearchAst = (state, dbSearchObject, getStack) => {
    const query = getJSValue(state,'placeholder', 'query', dbSearchObject).value
    const rootWithoutInverses = getObject(state, query)
    const rootProps = Object.assign({}, rootWithoutInverses.props, dbSearchObject.inverses)
    const root = Object.assign({}, rootWithoutInverses, {
        props: rootProps,
        inverses: dbSearchObject.inverses
    })
    if (getStack.length > 1) { throw 'get stack length greater than one' }
    const attr = getStack[0].props.attribute
    const ast = getJSValue(state, 'placeholder', attr, root)
    return { query, root, ast }
}
