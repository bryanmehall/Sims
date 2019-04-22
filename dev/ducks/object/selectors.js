/* eslint pure/pure: 2 */
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE, THIS } from './constants'
import { isUndefined } from './utils'
import { getValue, getName, objectFromHash, getAttr, getPrimitiveType } from './objectUtils'
import { getDBsearchAst } from './DBsearchUtils'
import { createStateArg, resolveStateASTs } from './stateUtils'
import { addContextToGetStack } from './contextUtils'

/*
refactor todo:
    -switch all args to get objects
        -replace THIS with next value
        -replace root can be next value
*/

const combineArgs = (childAsts) => (
    childAsts.reduce((combined, ast) => {
        //add warning here for overwriting property
        if (typeof ast === 'undefined'){
            throw new Error("LynxError: ast is undefined")
        }
        return Object.assign(combined, ast.args)
    },{})
)

const getNext = (state, currentObject, searchArgData) => {
    const { argKey, getStack, context } = searchArgData
    const searchName = getName(state, currentObject) //remove for debug
    const nextGet = getStack[0]
    const newGetStack = getStack.slice(1)
    const attr = getAttr(nextGet, 'attribute')//attribute to go to
    //search through context to see if the current attr from the get stack matches any of the first attrs from the context
    //if it does then return the
    const contextFunctionArray = context.map(
        (contextPath) => {
            if (contextPath.attr === attr) {
                const newSearchArgs = { ...searchArgData, query: THIS, getStack: newGetStack }
                const nextValue = objectFromHash(state, contextPath.value)
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs) //think of this as getting the child args
                const returnFunctionData = argsToVarDefs(state, currentObject, nextValueFunctionData)
                return returnFunctionData
            } else {
                return undefined
            }
        })
        .filter((contextFunctionData) => (typeof contextFunctionData !== 'undefined'))
    //if there is a change then return context function Data
    if (contextFunctionArray.length === 1) {
        return contextFunctionArray[0]
    } else if (contextFunctionArray.length > 1) {
        throw 'LynxError: handle context here'
    }
    if (attr === 'previousState'){
        if (newGetStack.length > 0){
            throw new Error('LynxError: handle case where get stack does not end at previous state')
        }
        return createStateArg(state, currentObject, argKey);
    }

    const nextValue = getValue(state, attr, currentObject) //evaluate attr of currentobject
    const nextJSValue = getValue(state, 'jsPrimitive', nextValue)
    //const nextJSValue = addContext(state, attr, nextJSValueNoContext, currentObject)
    if (isUndefined(nextValue)) { //if the next value is not defined treat it as an inverse
        //this must be nextValue not nextjsvalue because otherwise it triggers for no js primitive not where attr is not defined --refactor jsprim to be able to tell the difference?
        console.log(currentObject, attr)
        const newSearchArgs = { argKey: argKey, query: THIS, type: INVERSE, context, getStack: getStack }//don't slice get stack here --slice it when evaluating inverse arg
        return { args: { [argKey]: newSearchArgs }, varDefs: [] }
    } else if (nextJSValue.type === GLOBAL_SEARCH) { //combine this with local get handler below?
        //this gets the ast of the end of the get stack not the root
        const { query, ast } = getDBsearchAst(state, nextValue, newGetStack)
        const hash = getAttr(nextValue, 'hash')
        const dbSearchArg = { [hash]: {
                query,
                hash,
                type: GLOBAL_SEARCH,
                getStack: newGetStack,
                context: addContextToGetStack(state, context, attr, currentObject, hash),
            } }
        const { args, varDefs } = argsToVarDefs(state, currentObject, { args: ast.args, varDefs: ast.varDefs })
        //combine args from db search ast, with any args in putting this in contex t of current with db arg
        const combinedArgs = Object.assign({}, ast.args, args, dbSearchArg)
        const searchAST = Object.assign({}, nextJSValue, { args: combinedArgs, varDefs })
        return {
            args: combinedArgs,
            varDefs: [
                {
                    key: argKey,
                    varDefKey: argKey,
                    ast: searchAST,
                    inline: false,
                    comment: ` //dbSearch: ${query}`
                },
                ...varDefs
            ]
        }//this arg key needs to be removed and a new dbSearch argument needs to be added
    } else if (nextJSValue.type === 'get') {
        //for direct get: if root is not search or get
        const root = getValue(state, "rootObject", nextValue)
        const rootType = getPrimitiveType(root)
        if (rootType !== 'get' && rootType !== 'search') { //don't move conditions to get
            //needs larger scale refactoring
            const newSearchArgs = {
                ...searchArgData,
                query: THIS,
                context: addContextToGetStack(state, context, attr, currentObject, getAttr(nextValue, 'hash')),
                getStack: newGetStack
            }
            const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)
            return argsToVarDefs(state, currentObject, nextValueFunctionData)
        }
        const arg = Object.values(nextJSValue.args)
        const childQuery = arg[0].query
        const childGetStack = arg[0].getStack
        const combinedGetStack = childGetStack.concat(newGetStack)
        const appendedSearchArgs = {
            ...searchArgData,
            query: childQuery,
            getStack: combinedGetStack
        }
        const getFunctionData = { args: { [argKey]: appendedSearchArgs }, varDefs: [] }
        return argsToVarDefs(state, currentObject, getFunctionData)
    } else {
        const newSearchArgs = {
            ...searchArgData,
            query: THIS,
            context: addContextToGetStack(state, context, attr, currentObject, getAttr(nextValue, 'hash')),
            getStack: newGetStack
        }
        const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs) //think of this as getting the child args
        const returnFunctionData = argsToVarDefs(state, currentObject, nextValueFunctionData)
        return returnFunctionData
    }
}


//the end of the get path is the target object

const createVarDef = (state, currentObject, searchArgData) => {
    const { argKey, context } = searchArgData
    //get primitve of the end of the get stack
    const jsResult = getValue(state, 'jsPrimitive', currentObject)
    const args = jsResult.args
    const argsWithContext = Object.entries(args)
        .reduce((args, entry) => {
            const targetContext = entry[1].context || [] //if context is undefined
            const appendedContext = targetContext.concat(context)
            const argWithAppendedContext = { ...{}, ...entry[1], context: appendedContext }
            return { ...{}, ...args, [entry[0]]: argWithAppendedContext }
        }, {})
    const targetFunctionData = { args: argsWithContext, varDefs: jsResult.varDefs }
    const inverseFunctionData = argsToVarDefs(state, currentObject, targetFunctionData)

    const searchName = getName(state, currentObject) //remove for debug
    if (isUndefined(jsResult)) {
        throw new Error('LynxError: adding recursive function at varDef')
    } else {
        const variableDefinition = {
            key: argKey,
            varDefKey: jsResult.hash,
            ast: Object.assign({}, jsResult, { args, varDefs: inverseFunctionData.varDefs }),
            string: jsResult.string,
            comment: `//${searchName}`,
            context: context
        }
        return { args: inverseFunctionData.args, varDefs: [variableDefinition, ...inverseFunctionData.varDefs] }
    }
}

const reduceGetStack = (state, currentObject, searchArgData) => { // get all args and varDefs of an argument
    //iteratively get the getStack[0] attribute of current object to find the end of the stack
    const { query, getStack } = searchArgData
    const searchName = getName(state, currentObject)
    if (query === searchName || query === THIS){ //the query THIS is a for objects that always match.
        if (getStack.length === 0){
            return createVarDef(state, currentObject, searchArgData)
        } else {
            return getNext(state, currentObject, searchArgData)
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
const convertToSearchArgs = (args) => (
    Object.entries(args)
        .filter((arg) => (arg[1].type === LOCAL_SEARCH || arg[1].type === INVERSE))
        .map((searchArg) => ({ //unpack from object.entries form
            argKey: searchArg[0],
            ...searchArg[1]
        }))
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
        Object.assign(args, newVarDef.ast.args)
    })
    return { args, varDefs }
}

//if an an argument is defined entirely under the current object in the tree then it is considered
//resolved and is added to varDefs
export const argsToVarDefs = (state, currentObject, functionData) => { //test if the args in functionData are resolved...return
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    const combinedArgs = functionData.args
    //console.log(combinedArgs)
    const searchArgs = convertToSearchArgs(combinedArgs)
    const resolvedFunctionData = searchArgs.map((searchArgData) => {
            const reduced = reduceGetStack(state, currentObject, searchArgData)
            if (reduced.args.hasOwnProperty('recursive')){ //handle struct primitives
                throw new Error('LynxError: recursive')
                //throw 'recursive'
            }
            return reduced
        })
        .reduce(reduceFunctionData, functionData)
    //overwrite state args with updated state args (resolve args of state AST)
    const newStateArgs = resolveStateASTs(state, combinedArgs, currentObject)
    const argsWithState = Object.assign({}, resolvedFunctionData.args, newStateArgs)
    return { varDefs: resolvedFunctionData.varDefs, args: argsWithState }
}

/*combine args of children of the currentObject
for each arg divide by type
if LOCAL_SEARCH:
    arg query can match name or not
    if match:
        if getStack.length > 0:
            pop first attr off of get stack
            if attr == previousState:
                get ast of value
                //todo handle where get stack is not at then end
            if attr is inverse(in context):
                //handle case where there are two matching properties in context

            get nextValue of attr relative to currentObject
            if next value is get:
            if next value is globalSearch:
            else:
        if getStack.length == 0:
            move arg to varDef
    if no match:
        move no args to varDefs

if INVERSE:
if STATE_ARG:
    state arg has ast. run argsToVarDefs on ast, then put back into state arg
if GLOBAL_SEARCH:
    place in current o
*/

export const getArgsAndVarDefs = (state, childASTs, currentObject, childAttrs) => {
    const combinedArgs = combineArgs(childASTs, childAttrs)//combine arguments of sub functions
    const initialFunctionData = { args: combinedArgs, varDefs: [] } //search args moves resolved defs from args to varDefs
    return argsToVarDefs(state, currentObject, initialFunctionData)
}
