import { objectFromName, getHash, getValue, getJSValue, getAttr } from './objectUtils'
import { GLOBAL_SEARCH } from './constants'
import { getArgsAndVarDefs } from './selectors'
//import { buildFunction } from './IRutils'

export const resolveDBSearches = (state, combinedArgs) => { //move db searches at app to variable defs
    return Object.values(combinedArgs)
        .filter((arg) => (arg.type === GLOBAL_SEARCH)) //combine these conditions
        .map((arg) => {
            let root = objectFromName(state, arg.query)
            root.props.hash = getHash(root) //formalize what hash means so it is consistent //remove prop here
            const rootProps = Object.assign({}, root.props, arg.searchContext) //remove prop here
            root = Object.assign({}, root, {
                props: rootProps, //remove prop here
            })
            const getStack = arg.getStack
            if (getStack.length > 1) { throw 'get stack length greater than one' }
            let ast, args1, variableDefs1
            if (getStack.length === 0){ //generalize for getStack of length n
                ast = getValue(state, 'jsPrimitive', root).value
                const { args, variableDefs } = getArgsAndVarDefs(state, [ast], root)
                args1 = args
                variableDefs1 = variableDefs
            } else {
                const attr = getAttr(getStack[0], 'attribute')
                const nextValue = getValue(state, attr, root).value
                ast = getValue(state, 'jsPrimitive', nextValue).value
                const { args, variableDefs } = getArgsAndVarDefs(state, [ast], nextValue)
                args1 = args
                variableDefs1 = variableDefs
            }
            ast.inline = false
            ast.isFunction = true
            const astWithVarDefs = Object.assign({}, ast, { args: args1, variableDefs: variableDefs1 })
            return {
                key: arg.hash,
                varDefKey: arg.hash,
                ast: astWithVarDefs,
                string: "",
                comment: `//dbSearch for ${arg.query}`
            }
        })
}

/*****************
handling recursion
for recursive functions the pure version of getDBsearchAst results in an infinite loop in the compiler because the ast of the function needs the arguments of itself to compile. Should this, and the whole compiler, be lazily evaluated instead?
*****************/
let dbCache = {}//switch this to cache all ASTs
//this gets the ast of the primitive at the end of the get stack not the root object
export const getDBsearchAst = (state, dbSearchObject, getStack) => {
    const hash = getAttr(dbSearchObject, 'hash')
    //todo: if the same ast is hashed twice with a different get stack it will create undefined results
    if (dbCache.hasOwnProperty(hash)){
        return dbCache[hash]
    }
    dbCache[hash] = { //prevent recursive evaluation
        query: 'fact',
        ast: { type: 'recursive', args: {}, variableDefs: [], children: {}, context: {} }
    }
    const query = getJSValue(state,'placeholder', 'query', dbSearchObject).value
    const rootWithoutInverses = objectFromName(state, query)
    const rootProps = Object.assign({}, rootWithoutInverses.props, dbSearchObject.inverses) //remove prop here
    const root = Object.assign({}, rootWithoutInverses, {
        props: rootProps, //remove prop here
    })
    if (getStack.length > 1) { throw 'get stack length greater than one' } //todo:make this work for longer paths
    if (getStack.length === 0){
        const ast = getValue(state, 'jsPrimitive', root).value
        const searchArgs = { query, root, ast }
        dbCache[hash] = searchArgs
        return searchArgs
    }
    const attr = getAttr(getStack[0], 'attribute')
    const ast = getJSValue(state, 'placeholder', attr, root)
    const { args, variableDefs } = getArgsAndVarDefs(state, [ast], root)
    const astWithArgs = Object.assign({}, ast, { args, variableDefs })
    const searchData = { query, root, ast: astWithArgs }
    dbCache[hash] = searchData
    return searchData
}
