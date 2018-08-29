/* eslint pure/pure: 2 */
import { formatGetLog, deleteKeys, compileToJS } from './utils'
import { astToFunctionTable, buildFunction } from './IRutils'
import { getValue, getName, getObject, hasAttribute } from './objectUtils'
import { getDBsearchAst, resolveDBSearches } from './DBsearchUtils'

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
    //console.log('name:', searchName, 'query:', query, currentObject, searchArgData)
    if (searchName === query || query === "$this"){ //"$this" is a for objects that always match. $ is to prevent accidental matches
        if (searchName === "txt"){
            console.log('txt', searchArgData)
        }
        if (getStack.length === 0){
            console.log('resloving', currentObject, searchArgData)
            const { value: jsResult } = getValue(state, 'placeholder', 'jsPrimitive', currentObject)
            if (jsResult.type === 'undef') {
                console.log('adding recursive function', currentObject, searchName)
                //throw new Error('recursive')
                return { args: {}, varDefs: [] }
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
            const attr = nextGet.props.attribute//attribute to go to
            const isInverseAttr = currentObject.hasOwnProperty('inverses') ? currentObject.inverses.hasOwnProperty(attr) : false
            if (isInverseAttr){
                //return args to show that this is not a resolved attribute
                //const { value: inverseObject } = getValue(state, 'placeholder', attr, currentObject)
                const currentName = getName(state, currentObject)
                //console.log(`${currentName}.${attr} is an inverse. returning: ${formatGetLog('this', newGetStack)}`)
                const hasAttr = hasAttribute(currentObject, attr)
                if (hasAttr) {
                    const newSearchArgs = { argKey, query: '$this', type, context, getStack: newGetStack }
                    //should this be
                    const { value: nextValue } = getValue(state, 'placeholder', attr, currentObject)
                    console.log(nextValue)
                    const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)
                    const childArgs = argsToVarDefs(state, currentObject, nextValueFunctionData, nextValueFunctionData.args)
                    return childArgs
                } else {
                    throw new Error('attribute not found')
                }
                /*return {
                    args: {
                        [argKey]: {
                            //hash: inverseHash,
                            type: "localSearch",
                            query: '$this',
                            getStack: newGetStack
                        }
                    },
                    varDefs: []
                }*/
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
            if (nextJSValue.type === 'undef'){ //next value does not have primitive
                const newSearchArgs = { argKey, type, context, query: '$this', getStack: newGetStack }
                //console.log(`${nextName} is not a primitive`, nextValue, newGetStack)
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)
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
                const combinedArgs = Object.assign(args, dbSearchArg)
                //console.log(`the args of the db Search are dbSearchArg: ${nextValue.props.hash}`, args)
                return {
                    args: combinedArgs ,
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
                //console.log(`${formatGetLog(query, getStack)} is resolved` )
                const childQuery = arg.length === 0 ? searchName : arg[0].query
                const childGetStack = arg.length === 0 ? [] : arg[0].getStack
                const combinedGetStack = childGetStack.concat(newGetStack)
                const newSearchArgs = {
                    argKey,
                    type,
                    context,
                    query: childQuery,
                    getStack: combinedGetStack
                }
                //console.log('getting', formatGetLog(childQuery, combinedGetStack))
                return reduceGetStack(state, currentObject, newSearchArgs)
            } else {
                const newSearchArgs = { argKey, query: '$this', type, context, getStack: newGetStack }
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
            //console.log(`reducing get stack: ${formatGetLog(searchArgData.query, searchArgData.getStack)} `)
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
    const { value: appAST } = getValue(state, 'app', 'jsPrimitive', appData)
    if (appAST === undefined){ throw 'appAST is undefined' }
    const dbASTs = resolveDBSearches(state, appAST.args)
    const appVarDefs = appAST.variableDefs.concat(dbASTs)
    const appASTwithDB = Object.assign(appAST, { variableDefs: appVarDefs })
    const functionTable = astToFunctionTable(appASTwithDB)
    const appString = buildFunction(appASTwithDB).string
    const renderMonad = compileToJS('functionTable', `${appString}`)//returns a thunk with all of render information enclosed
    return { renderMonad, functionTable, ast: appASTwithDB, objectTable: {} }
}
