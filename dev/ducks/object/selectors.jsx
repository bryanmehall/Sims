/* eslint pure/pure: 2 */
import { formatGetLog, debugReduce, deleteKeys, compileToJS, objectFromEntries, limiter } from './utils'
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE, THIS, UNDEFINED } from './constants'
import { astToFunctionTable, buildFunction } from './IRutils'
import { getValue, getName, getObject, hasAttribute, objectFromHash, getInverseAttr } from './objectUtils'
import { getDBsearchAst, resolveDBSearches } from './DBsearchUtils'

/*
todo:
    -add factorial function
    -fix problem of double inverse attributes
    -build visualizer
        -are structs needed?
    -construct state model
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

const resolveInverses = (state, functionData, attr) => {
    const { args, varDefs } = functionData
    const inverseAttr = getObject(state, attr).props.inverseAttribute
    const newArgs = Object.entries(args)
        .map((entry) => {
            if (entry[1].type === INVERSE && entry[1].query === inverseAttr){
                const localArg = Object.assign({}, entry[1], { type: LOCAL_SEARCH, query: THIS, getStack: entry[1].getStack.slice(1) })
                return [entry[0], localArg]
            } else {
                return entry
            }
        })
        .reduce(objectFromEntries, {})
    //const newPrim = Object.assign({}, prim, { args: newArgs })


    return { args: newArgs, varDefs }
}

function reduceGetStack(state, currentObject, searchArgData){ // get all args and varDefs of an argument
    //iteratively get the getStack[0] attribute of current object to find the end of the stack
    const { argKey, query, getStack, type, context } = searchArgData
    //limiter(4000, 100)

    const searchName = getName(state, currentObject)
    //console.log('name:', searchName, 'query:', query, currentObject, searchArgData)
    if (query === searchName || query === THIS){ //the query THIS is a for objects that always match.
        if (getStack.length === 0){
            const { value: jsResult } = getValue(state, 'placeholder', 'jsPrimitive', currentObject)
            const inverseAttr = getInverseAttr(state, context.$attr)
            let inverseFunctionData = { args: {}, varDefs: [] }
            const targetFunctionData = { args: jsResult.args, varDefs: jsResult.variableDefs }
            let functionData1 = { varDefs: [], args: {} }
            if (inverseAttr !== undefined){//######################################################this is a false positive?
                const inverseObject = objectFromHash(context[inverseAttr]) //get the inverse value
                functionData1 = argsToVarDefs(state, inverseObject , targetFunctionData, context.$attr)
                console.log('functionData1', functionData1)
                inverseFunctionData = argsToVarDefs(state, currentObject, targetFunctionData, context.$attr)
            } else {
                console.log('target', targetFunctionData)
                inverseFunctionData = argsToVarDefs(state, currentObject, targetFunctionData, context.$attr)
            }
            if (jsResult.type === UNDEFINED) {
                console.log('adding recursive function', currentObject, searchName)
                //throw new Error('recursive')
                return { args: {}, varDefs: [] }
            } else {
                const variableDefinition = {
                    key: argKey,
                    varDefKey: jsResult.hash,
                    ast: Object.assign({}, jsResult, inverseFunctionData),
                    string: jsResult.string,
                    comment: `//${searchName}`
                }
                return { args: inverseFunctionData.args, varDefs: [variableDefinition, ...functionData1.varDefs] }
            }
        } else {
            const nextGet = getStack[0]
            const newGetStack = getStack.slice(1)
            const attr = nextGet.props.attribute//attribute to go to
            const isInverseAttr = currentObject.hasOwnProperty('inverses') ? currentObject.inverses.hasOwnProperty(attr) : false
            const currentName = getName(state, currentObject)
            if (isInverseAttr){
                //if the attribute is inverse return an inverse arg that only matches
                const hasAttr = hasAttribute(currentObject, attr)
                if (hasAttr) {
                    const newSearchArgs = { argKey: argKey, query: attr, type: INVERSE, context, getStack: getStack }//don't slice get stack here --slice it when evaluating inverse arg
                    //does this indicate a bigger problem with off by one errors? some functions work on current, some work on next
                    debugReduce(1, `${currentName}.${attr} is an inverse. returning new inverse argument: ${formatGetLog('', newGetStack)}`, currentName)
                    debugReduce(-1)
                    return { args: { [argKey]: newSearchArgs }, varDefs: [] }
                } else {
                    throw new Error('attribute not found')
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
            if (nextJSValue.type === UNDEFINED){ //next value does not have primitive
                const newSearchArgs = { argKey, type, context, query: THIS, getStack: newGetStack }
                debugReduce(1, `${currentName}.${attr} is not a primitive`, currentName)
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)
                //handle case where nextName === query returned...need to move arg to varDef
                const childArgsAndVarDefs = argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
                debugReduce(-1)
                return childArgsAndVarDefs
            } else if (nextJSValue.type === GLOBAL_SEARCH) { //combine this with local get handler below?
                //this gets the ast of the end of the get stack not the root
                const { query, ast } = getDBsearchAst(state, nextValue, newGetStack)
                const dbSearchArg = { [nextValue.props.hash]: {
                        query,
                        hash: nextValue.props.hash,
                        type: GLOBAL_SEARCH,
                        getStack: newGetStack,
                        searchContext: nextValue.inverses //switch to context
                    } }
                const { args, varDefs } = argsToVarDefs(state, currentObject, { args: ast.args, varDefs: ast.variableDefs }, attr)
                //combine args from db search ast, with any args in putting this in context of current with db arg
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
            } else if (nextValue.type === 'get') {
                const arg = Object.values(nextJSValue.args).filter((arg) => (arg.type === LOCAL_SEARCH))
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
                //console.log('getting#########', formatGetLog(childQuery, combinedGetStack))
                return reduceGetStack(state, currentObject, newSearchArgs)
            } else {
                debugReduce(1, `getting ${formatGetLog(THIS, getStack)}`, currentName)
                const newSearchArgs = { argKey, query: THIS, type, context, getStack: newGetStack }
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs)//think of this as getting the child args
                const childArgs = argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
                debugReduce(-1, childArgs)
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
        .filter((arg) => (arg[1].type === LOCAL_SEARCH))
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
const getInverseArgs = (args) => (
    Object.entries(args)
        .filter((entry) => (entry[1].type === INVERSE))
        .reduce(objectFromEntries, {})
)

/*
combine arg and varDef movements to create the final args and varDefs
*/
const reduceFunctionData = (functionData, newFunctionData) => {
    //this is reversed so var defs will be in the right order -- is this always true?
    const varDefs = functionData.varDefs.concat(newFunctionData.varDefs)
    //console.log('merge', functionData.args, newFunctionData.args)
    const args = Object.assign({}, functionData.args, newFunctionData.args)
    const newVarDefs = newFunctionData.varDefs
    //console.log('args', args, newVarDefs)
    newVarDefs.forEach((newVarDef) => {
        if (newVarDef.hasOwnProperty('key')){
            delete args[newVarDef.key]
        }
        //add args from this varDef --after for repeated keys ie varDef key = argKey?
        Object.assign(args, newVarDef.ast.args)

    })
    return { args, varDefs }
}

const isResolved = (arg, name) => (
    arg.query === name || arg.query === THIS || arg.query === '$resolved'
)
const isNotResolved = (arg, name) => (
    !isResolved(arg, name) //catches local search args that do not match and all other args
)

//if an an argument is defined entirely under the current object in the tree then it is considered
//resolved and is added to variableDefs
const argsToVarDefs = (state, currentObject, functionDataWithInverse, attr) => {//test if the args in functionData are resolved...return
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    const functionData = resolveInverses(state, functionDataWithInverse, attr)
    const combinedArgs = functionData.args
    //const objectName = getName(state, currentObject)
    const searchArgs = convertToSearchArgs(combinedArgs)
    //const inverseArgs = getInverseArgs(combinedArgs)
    //const matchingArgs = searchArgs.filter((arg) => isResolved(arg, objName))
    //const unresolvedArgs = searchArgs.filter((arg) => isNotResolved(arg, objName))
    //console.log('argsToVarDefs', objectName, attr, searchArgs)
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
    return resolvedFunctionData
}

//combine args of children and test which of these args are resolved
export const getArgsAndVarDefs = (state, childASTs, currentObject) => {
    const combinedArgs = combineArgs(childASTs)//combine arguments of sub functions
    const initialFunctionData = { args: combinedArgs, varDefs: [] } //search args moves resolved defs from args to varDefs
    //todo: change x to sometng that will never have inverse
    const inverseAttr = currentObject.hasOwnProperty('inverses') ? currentObject.inverses.$attr : 'x'
    const { args, varDefs } = argsToVarDefs(state, currentObject, initialFunctionData, inverseAttr)
    return { args, variableDefs: varDefs }
}

//compile a module...right now this only does app
export const compile = (state) => {
    const appData = getObject(state, 'app')
    const { value: appAST } = getValue(state, 'app', 'jsPrimitive', appData)
    if (appAST === undefined){ throw 'appAST is undefined' }
    const dbASTs = resolveDBSearches(state, appAST.args)
    const appVarDefs = appAST.variableDefs.concat(dbASTs)
    const appASTwithDB = Object.assign(appAST, { variableDefs: appVarDefs })
    const functionTable = astToFunctionTable(appASTwithDB)
    //functionTable.$hash997200528 = new Function('a', 'return a')
    const appString = buildFunction(appASTwithDB).string
    const renderMonad = compileToJS('functionTable', `${appString}`)//returns a thunk with all of render information enclosed
    return { renderMonad, functionTable, ast: appASTwithDB, objectTable: {} }
}
