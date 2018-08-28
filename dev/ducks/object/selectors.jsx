/* eslint pure/pure: 2 */
import { formatGetLog, formatDBSearchLog, deleteKeys, compileToJS } from './utils'
import { astToFunctionTable, buildFunction } from './IRutils'
import { getValue, getJSValue, getName, getObject, getHash } from './objectUtils'

/*
refactor todo:
    -switch render and prim to just io
    -make objectTabl constant per evaluation cycle
*/
const combineArgs = (args) => {
    const reduced = args.reduce((combined, prim) => (
        Object.assign(combined, prim.args)
    ),{})
    return reduced
}

function reduceGetStack(state, currentObject, searchArgData){ // get all args and varDefs of an argument
    //iteratively get the getStack[0] attribute of current object to find the end of the stack
    const { argKey, query, getStack, type, context } = searchArgData
    //limiter(2000000, 100)
    const searchName = getName(state, currentObject)
    console.log('name:', searchName, 'query:',query, currentObject, searchArgData)
    if (searchName === query || query === "$this"){ //"$this" is a for objects that always match. $ is to prevent accidental matches
        if (getStack.length === 0){
            console.log('resloving', currentObject)
            const { value: jsResult } = getValue(state, 'placeholder', 'jsPrimitive', currentObject)
            if (jsResult.type === 'undef') {
                console.log('adding recursive function', currentObject, searchName)
                throw new Error('recursive')
                return { args: {  }, varDefs: [] }
            } else {
                const variableDefinition = {
                    key: argKey,
                    ast: jsResult,
                    string: jsResult.string,
                    comment: `//${searchName}`
                }
                return { args: jsResult.args, varDefs: [variableDefinition] }
            }
        } else {
            const nextGet = getStack[0]
            const newGetStack = getStack.slice(1)
            const currentName = getName(state, currentObject)
            const attr = nextGet.props.attribute//attribute to go to
            const isInverseAttr = currentObject.hasOwnProperty('inverses') ? currentObject.inverses.hasOwnProperty(attr) : false
            if (isInverseAttr){
                //return args to show that this is not a resolved attribute
                const { value: inverseObject } = getValue(state, 'placeholder', attr, currentObject)
                console.log(`${currentName}.${attr} is an inverse. returning: ${formatGetLog('this', newGetStack)}`)
                return {
                    args: {
                        [argKey]: {
                            //hash: inverseHash,
                            type: "localSearch",
                            query: '$this',
                            getStack: newGetStack
                        }
                    },
                    varDefs: []
                }
            }
            //the next section is for allowing objects referenced by a get to have inverse attributes
            //if nextGet has any attributes other than those listed
            //then get inverses to add to nextValue
            const extraAttrs = ['jsPrimitive', 'rootObject', 'attribute', 'parentValue', 'hash']
			const inverseAttributes = deleteKeys(nextGet.props, extraAttrs)
            const hasInverses = Object.keys(inverseAttributes).length !== 0
            const inverses = hasInverses ? inverseAttributes : 'placeholder'
            //get the next value with inverses from cross edge attached
            const { value: nextValue } = getValue(state, inverses, attr, currentObject) //evaluate attr of currentobject
            const { value: nextJSValue } = getValue(state, 'placeholder', 'jsPrimitive', nextValue)
            console.log('js', nextJSValue)
            const nextName = getName(state, nextValue)
            if (nextJSValue.type === 'undef'){ //next value does not have primitive
                const newSearchArgs = { argKey, type, context, query:'$this', getStack: newGetStack }
                console.log(`${nextName} is not a primitive`, nextValue, newGetStack)
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)
                console.log('####', nextValueFunctionData)
                //handle case where nextName === query returned...need to move arg to varDef
                const childArgs = argsToVarDefs(state, currentObject, nextValueFunctionData, nextValueFunctionData.args)
                return childArgs
            } else if (nextJSValue.type === 'dbSearch') { //combine this with local get handler below?
                const { query, root, ast } = getDBsearchAst(state, nextValue, newGetStack)
                const { args } = getArgsAndVarDefs(state, [ast], root)
                const dbSearchArg = { [nextValue.props.hash]: {
                        query,
                        hash: nextValue.props.hash,
                        type: 'dbSearch',
                        getStack: newGetStack,
                        searchContext: nextValue.inverses //switch to context
                    } }
                //const combinedArgs = Object.assign(args, dbSearchArg)
                console.log(`the args of the db Search are dbSearchArg: ${nextValue.props.hash}`, args)
                return {
                    args: args ,
                    varDefs: [{
                        key: argKey,
                        ast: nextJSValue,
                        comment: ""//`//dbSearch: ${query}`
                    }]
                }//this arg key needs to be removed and a new dbSearch argument needs to be added
            } else if (nextValue.type === 'get') {
                const arg = Object.values(nextJSValue.args).filter((arg) => (arg.type === 'localSearch'))
                if (arg.length > 1) { //this would mean that a child has more than one argument
                    //console.log('args for ',searchName, arg)
                    throw 'arg length greater than one'
                }
                console.log(`${formatGetLog(query, getStack)} is resolved` )
                const childQuery = arg.length === 0 ? searchName : arg[0].query
                const childGetStack = arg.length === 0 ? [] : arg[0].getStack
                const combinedGetStack = childGetStack.concat(newGetStack)
                const newSearchArgs = { argKey, type, context, query: childQuery, getStack: combinedGetStack }
                console.log('getting', formatGetLog(childQuery, combinedGetStack))
                return reduceGetStack(state, currentObject, newSearchArgs)
            } else {
                const newSearchArgs = { argKey, query:'$this', type, context, getStack: newGetStack }
                console.log('standard reduce', currentObject, newSearchArgs)
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)
                const childArgs = argsToVarDefs(state, currentObject, nextValueFunctionData, nextValueFunctionData.args)
                return childArgs
            }
        }
    } else {
        if (searchName === 'app'){
            console.warn(`LynxError: no match found for query "${query}"\n Traceback:`)
        }
        return { args: {}, varDefs: [] }//this just doesn't move any args, it doesn't mean that there are not any
    }
}

/*
convert args in the form {argKey:{query:"query" getStack:[]}}
to searchArgs in the form:[{argKey, query, getStack}]
*/
export const convertToSearchArgs = (args) => (
    Object.entries(args)
        .filter((arg) => (arg[1].type === 'localSearch'))
        .map((searchArg) => ({ //unpack from object.entries form
            argKey: searchArg[0],
            query: searchArg[1].query,
            getStack: searchArg[1].getStack,
            context: searchArg[1].context,
            type: searchArg[1].type
        }))
)

const getIoArg = (args) => (
    Object.entries(args)
        .filter((entry) => (entry[0] === 'prim'))
        .map(() => ({ prim: true }))
)

/*
combine arg and varDef movements to create the final args and varDefs
*/
const reduceFunctionData = (functionData, newFunctionData) => {
    //this is reversed so var defs will be in the right order -- is this always true?
    const varDefs = functionData.varDefs.concat(newFunctionData.varDefs)
    const args = Object.assign({}, functionData.args, newFunctionData.args)
    const newVarDefs = newFunctionData.varDefs
    newVarDefs.forEach((newVarDef) => {
        if (newVarDef.hasOwnProperty('key')){
            delete args[newVarDef.key]
        }
    })
    return { args, varDefs }
}

const isResolved = (arg, name) => (
    arg.query === name || arg.query === '$this' || arg.query === '$resolved'
)
const isNotResolved = (arg, name) => (
    !isResolved(arg, name) //catches local search args that do not match and all other args
)
//convert object of arguments to object of unresolved args and list of variable defs
//if an an argument is defined entirely under the current object in the tree then it is considered
//resolved and is added to variableDefs
const argsToVarDefs = (state, currentObject, functionData, combinedArgs) => {
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    const objectName = getName(state, currentObject)
    const searchArgs = convertToSearchArgs(combinedArgs)
    //const matchingArgs = searchArgs.filter((arg) => isResolved(arg, objName))
    //const unresolvedArgs = searchArgs.filter((arg) => isNotResolved(arg, objName))
    const resolvedFunctionData = searchArgs.map((searchArgData) => {
            console.log(`reducing get stack: ${formatGetLog(searchArgData.query, searchArgData.getStack)} `)
            const reduced = reduceGetStack(state, currentObject, searchArgData)
            if (reduced.args.hasOwnProperty('recursive')){ //handle struct primitives
                console.log('recursive', combinedArgs)
                //throw 'recursive'
            }
            return reduced
        })
        .reduce(reduceFunctionData, functionData)
    //console.log(resolvedFunctionData)
    return resolvedFunctionData
}
//get args and varDefs of an object
export const getArgsAndVarDefs = (state, childASTs, currentObject) => { //list of child objects in the form [{string:..., args:...}]
    const combinedArgs = combineArgs(childASTs)//combine arguments of sub functions
    //const searchArgs = convertToSearchArgs(combinedArgs)
    //const ioArgs = getIoArg(combinedArgs)
    //const objName = getName(state, currentObject)
    //const matchingArgs = searchArgs.filter((arg) => isResolved(arg, objName))
    //const unresolvedArgs = searchArgs.filter((arg) => isNotResolved(arg, objName))
    //const { args1, varDefs1 } = matchingArgs
        //.map((arg) => (reduceGetStack(state, currentObject, arg)))
        //.reduce(reduceFunctionData, { args: combinedArgs, varDefs: [] })

    const initialFunctionData = { args: combinedArgs, varDefs: [] } //search args moves resolved defs from args to varDefs
    const { args, varDefs } = argsToVarDefs(state, currentObject, initialFunctionData, combinedArgs)
    //console.log(args, args1, varDefs, varDefs1)
    return { args, variableDefs: varDefs }
}

export const compile = (state) => {
    const appData = getObject(state, 'app')
    const { value: display } = getValue(state, 'app', 'jsPrimitive', appData)
    if (display === undefined){ throw 'display is undefined' }
    console.log(display)
    const functionTable = astToFunctionTable(display)
    const appString = buildFunction(display).string
    const renderMonad = compileToJS('functionTable', `${appString}`)//returns a thunk with all of render information enclosed
    return { renderMonad, functionTable, ast: display, objectTable: {} }
}

/*
 let dbVariableDefs = []
    if (objectName === 'app'){ //move this to special function in compiler
        dbVariableDefs = resolveDBSearches(state, combinedArgs)
        console.log(`resolving db searches for`, formatDBSearchLog(dbVariableDefs))
        dbVariableDefs.forEach((varDef) => {
            delete combinedArgs[varDef.key]
        })
    }
    const functionDataWithDBDefs = Object.assign({}, functionData, {
        varDefs:functionData.varDefs.concat(dbVariableDefs)
    })*/
const resolveDBSearches = (state, combinedArgs) => { //move db searches at app to variable defs
    return Object.values(combinedArgs)
        .filter((arg) => {
            return arg.type === 'dbSearch' || arg.type === 'globalGet'}//combine these conditions
        )
        .map((arg) => {
            let  root = getObject(state, arg.query)
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
            const str = buildFunction(ast).string
            console.log(arg)
            return {
                key: arg.hash,
                ast,
                string: "",
                comment: `//dbSearch for ${arg.query}`
            }
        })
}

const getDBsearchAst = (state, dbSearchObject, getStack) => {
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
    return {query, root, ast};
}
