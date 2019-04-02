/* eslint pure/pure: 2 */
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE, THIS, UNDEFINED, STATE_ARG } from './constants'
import { primitives } from './primitives'
import { getValue, getName, objectFromHash, getInverseAttr } from './objectUtils'
import { getDBsearchAst } from './DBsearchUtils'

/*
refactor todo:
    -switch all args to get objects
        -replace THIS with next value
        -replace root can be next value
    -make objectTabl constant per evaluation cycle
*/

const combineArgs = (childPrims) => {
    childPrims.forEach((arg) => {
        if (typeof arg === 'undefined'){
            throw new Error("LynxError: arg is undefined")
        }
    })
    const reduced = childPrims.reduce((combined, prim) => (
        //add warning here for overwriting property
        Object.assign(combined, prim.args)
    ),{})
    return reduced
}

function createStateArg(state, currentObject, argKey) {
    const statePrimitive = primitives.state(state, currentObject)
    const hash = currentObject.props.hash
    const ast = getValue(state, 'jsPrimitive', currentObject).value
    const varDef = { //reassign value defined by get hash to the hash of curentObject
        key: argKey,
        varDefKey: statePrimitive.hash,
        ast: Object.assign({}, statePrimitive), //inverseFunctionData like in createVarDef?
        string: statePrimitive.string,
        comment: `// state ${statePrimitive.hash}`
    }
    //create ast for state with state argument resolved
    const astArgs = Object.assign({}, ast.args, { [hash]: { hash, type: STATE_ARG } })
    delete astArgs[argKey]
    const astVarDefs = ast.variableDefs.concat(varDef)
    const arg = {
        hash,
        type: STATE_ARG,
        getStack: [],
        ast: Object.assign({}, ast, { args: astArgs, variableDefs: astVarDefs }),
        searchContext: currentObject.inverses
    }
    return { args: { [hash]: arg }, varDefs: [varDef] }
}

const getNext = (state, currentObject, searchArgData) => {
    const { argKey, getStack, context } = searchArgData
    const searchName = getName(state, currentObject) //remove for debug
    const nextGet = getStack[0]
    const newGetStack = getStack.slice(1)
    const attr = nextGet.props.attribute//attribute to go to
    //search through context to see if the current attr from the get stack matches any of the first attrs from the context
    //if it does then return the
    const contextFunctionArray = context.map(
        (contextPath) => {
            if (contextPath.attr === attr) {
                const newSearchArgs = { ...searchArgData, query: THIS, getStack: newGetStack }
                const nextValue = objectFromHash(state, contextPath.value)
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs) //think of this as getting the child args
                const returnFunctionData = argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
                return returnFunctionData
            } else {
                return undefined
            }
        })
        .filter((contextFunctionData) => (typeof contextFunctionData !== 'undefined'))
    //if there is a change then return context function Data
    //console.log('context array', contextFunctionArray)
    if (contextFunctionArray.length === 1) {
        return contextFunctionArray[0]
    } else if (contextFunctionArray.length > 1) {
        throw 'LynxError: handle context here'
    }
    if (attr === 'previousState'){
        return createStateArg(state, currentObject, argKey);
    }

    const { value: nextValue } = getValue(state, attr, currentObject) //evaluate attr of currentobject
    const { value: nextJSValue } = getValue(state, 'jsPrimitive', nextValue)
    //const nextJSValue = addContext(state, attr, nextJSValueNoContext, currentObject)
    if (nextValue.type === 'undef') { //if the next value is not defined treat it as an inverse
        //this must be nextValue not nextjsvalue because otherwise it triggers for no js primitive not where attr is not defined --refactor jsprim to be able to tell the difference?
        const newSearchArgs = { argKey: argKey, query: THIS, type: INVERSE, context, getStack: getStack }//don't slice get stack here --slice it when evaluating inverse arg
        return { args: { [argKey]: newSearchArgs }, varDefs: [] }
    } else if (nextJSValue.type === GLOBAL_SEARCH) { //combine this with local get handler below?
        //this gets the ast of the end of the get stack not the root
        const { query, ast } = getDBsearchAst(state, nextValue, newGetStack)
        const dbSearchArg = { [nextValue.props.hash]: {
                query,
                hash: nextValue.props.hash,
                type: GLOBAL_SEARCH,
                getStack: newGetStack,
                context: addContextToGetStack(state, context, attr, currentObject, nextValue),
                searchContext: nextValue.inverses //switch to contex t
            } }
        const { args, varDefs } = argsToVarDefs(state, currentObject, { args: ast.args, varDefs: ast.variableDefs }, attr)
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
        const { value: root } = getValue(state, "rootObject", nextValue)
        if (root.type !== 'get' && root.type !== 'search') { //don't move conditions to get
            //needs larger scale refactoring
            const newSearchArgs = {
                ...searchArgData,
                query: THIS,
                context: addContextToGetStack(state, context, attr, currentObject, nextValue),
                getStack: newGetStack
            }
            const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)
            return argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
        }
        const arg = Object.values(nextJSValue.args).filter((arg) => (arg.type === LOCAL_SEARCH))
        if (arg.length > 1) { //this would mean that the get object has more than one argument
            throw 'arg length greater than one'
        }
        const childQuery = arg.length === 0 ? searchName : arg[0].query
        const childGetStack = arg.length === 0 ? [] : arg[0].getStack
        const combinedGetStack = childGetStack.concat(newGetStack)
        const appendedSearchArgs = {
            ...searchArgData,
            query: childQuery,
            getStack: combinedGetStack
        }
        const getFunctionData = { args: { [argKey]: appendedSearchArgs }, varDefs: [] }
        const getData = argsToVarDefs(state, currentObject, getFunctionData, attr)
        return getData
    } else {
        const newSearchArgs = {
            ...searchArgData,
            query: THIS,
            context: addContextToGetStack(state, context, attr, currentObject, nextValue),
            getStack: newGetStack
        }
        const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs) //think of this as getting the child args
        const returnFunctionData = argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
        return returnFunctionData
    }
}

const addContextToGetStack = (state, context, attr, currentObject, nextValue) => { //combine this with the context generator in objectUtils

    const hash = currentObject.props.hash
    const searchName = getName(state, currentObject) //remove for debug
    const inverseAttr = getInverseAttr(state, attr)
    const newContext = {
        debug: `${searchName}.${attr} has inverse ${inverseAttr} = ${hash}`,
        attr: inverseAttr,
        value: hash,
        source: nextValue.props.hash //remove for debug
    }
    return context.concat(newContext)
}
//the end of the get path is the target object

const createVarDef = (state, currentObject, searchArgData) => {
    const { argKey, context } = searchArgData
    //get primitve of the end of the get stack
    const { value: jsResult } = getValue(state, 'jsPrimitive', currentObject)
    const inverseAttr = context[0].attr //todo: need to loop through context
    //add context to all resulting arguments
    const args = typeof jsResult.args ==='undefined' ? {} : jsResult.args
    const argsWithContext = Object.entries(args)
        .filter((entry) => (entry[0] !== 'prim'))
        .reduce((args, entry) => {
            const targetContext = entry[1].context || [] //if context is undefined
            const appendedContext = targetContext.concat(context)
            const argWithAppendedContext = { ...{}, ...entry[1], context: appendedContext }
            return { ...{}, ...args, [entry[0]]: argWithAppendedContext }
        }, {})
    if (args.hasOwnProperty('prim')) {
        Object.assign(argsWithContext, { prim: true })
        //get rid of prim when refactoring? it isn't part of the main rendering monad
    }
    const targetFunctionData = { args: argsWithContext, varDefs: jsResult.variableDefs }

    const inverseFunctionData = argsToVarDefs(state, currentObject, targetFunctionData, inverseAttr)
    const searchName = getName(state, currentObject) //remove for debug
    if (jsResult.type === UNDEFINED) {
        console.warn('adding recursive function at varDef', currentObject, searchName)
        return { args: {}, varDefs: [] }
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
export const convertToSearchArgs = (args) => (
    Object.entries(args)
        .filter((arg) => (arg[1].type === LOCAL_SEARCH || arg[1].type === INVERSE))
        .map((searchArg) => ({ //unpack from object.entries form
            argKey: searchArg[0],
            query: searchArg[1].query,
            getStack: searchArg[1].getStack,
            context: searchArg[1].context,
            type: searchArg[1].type
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
//resolved and is added to variableDefs
const argsToVarDefs = (state, currentObject, functionData, attr) => { //test if the args in functionData are resolved...return
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    //const functionData = resolveInverses(state, functionDataWithInverse, attr)//varDefs just pass through
    const combinedArgs = functionData.args
    const searchArgs = convertToSearchArgs(combinedArgs)
    const resolvedFunctionData = searchArgs.map((searchArgData) => {
            const reduced = reduceGetStack(state, currentObject, searchArgData)
            if (reduced.args.hasOwnProperty('recursive')){ //handle struct primitives
                console.log('recursive', combinedArgs)
                //throw 'recursive'
            }
            return reduced
        })
        .reduce(reduceFunctionData, functionData)
    return resolvedFunctionData
}

//combine args of children and test which of these args are resolved
export const getArgsAndVarDefs = (state, childASTs, currentObject, childAttrs) => {
    const combinedArgs = combineArgs(childASTs, childAttrs)//combine arguments of sub functions
    const initialFunctionData = { args: combinedArgs, varDefs: [] } //search args moves resolved defs from args to varDefs
    const inverseAttr = 'x'
    const { args, varDefs } = argsToVarDefs(state, currentObject, initialFunctionData, inverseAttr)

    return { args, variableDefs: varDefs }
}
