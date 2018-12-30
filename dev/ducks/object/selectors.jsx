/* eslint pure/pure: 2 */
import { formatGetLog, debugReduce, deleteKeys, compileToJS, objectFromEntries, limiter } from './utils'
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE, THIS, UNDEFINED } from './constants'
import { astToFunctionTable, buildFunction } from './IRutils'
import { getValue, getName, getObject, hasAttribute, objectFromHash, getInverseAttr } from './objectUtils'
import { getDBsearchAst, resolveDBSearches } from './DBsearchUtils'

/*
todo:
    -fix problem of double inverse attributes
    -build visualizer
        -are structs needed?
    -construct state model
refactor todo:
    -switch all args to get objects
        -replace THIS with next value
        -replace root can be next value
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
    const args1 = args || {} //prevent undefined

    const newArgs = Object.entries(args1)
        .map((entry) => {
            if (entry[1].type === INVERSE && entry[1].query === inverseAttr){
                const localArg = Object.assign({}, entry[1], { type: LOCAL_SEARCH, query: THIS, getStack: entry[1].getStack.slice(1) })
                return [entry[0], localArg]
            } else {
                return entry
            }
        })
        .reduce(objectFromEntries, {})
    return { args: newArgs, varDefs }
}

const getNext = (state, currentObject, searchArgData) => {
    const { argKey, getStack, context } = searchArgData
    const searchName = getName(state, currentObject) //remove for debug
    const nextGet = getStack[0]
    const newGetStack = getStack.slice(1)
    const attr = nextGet.props.attribute//attribute to go to
    const isInverseAttr = currentObject.hasOwnProperty('inverses') ? currentObject.inverses.hasOwnProperty(attr) : false
    if (isInverseAttr){
        //if the attribute is inverse return an inverse arg that only matches
        if (!hasAttribute(currentObject, attr)) {
            throw new Error('LynxError: attribute not found')
        }
        const newSearchArgs = { argKey: argKey, query: attr, type: INVERSE, context, getStack: getStack }//don't slice get stack here --slice it when evaluating inverse arg
        //does this indicate a bigger problem with off by one errors? some functions work on current, some work on next
        return { args: { [argKey]: newSearchArgs }, varDefs: [] }
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
    if (attr === 'function'){
        console.log(nextValue)
    }
    if (nextJSValue.type === GLOBAL_SEARCH) { //combine this with local get handler below?
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
    } else if (nextJSValue.type === 'get') {
        //for direct get: if root is not search or get
        const { value: root } = getValue(state, 'placeholder', "rootObject", nextValue)
        if (root.type !== 'get' && root.type !== 'search'){//don't move conditions to get
            //needs larger scale refactoring
            const newSearchArgs = { ...searchArgData, query: THIS, getStack: newGetStack }
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
        return argsToVarDefs(state, currentObject, getFunctionData, attr)
    } else {
        const newSearchArgs = { ...searchArgData, query: THIS, getStack: newGetStack }
        if (attr === 'function'){
            console.log('nextValiue', nextValue)
        }
        const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs) //think of this as getting the child args
        if (attr === 'function'){
            console.log(nextValueFunctionData)
        }
        return argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
    }
}

const createVarDef = (state, currentObject, searchArgData) => {
    const { argKey, context } = searchArgData
    const { value: jsResult } = getValue(state, 'placeholder', 'jsPrimitive', currentObject)
    const searchName = getName(state, currentObject) //remove for debug
    const inverseAttr = getInverseAttr(state, context.$attr)
    const targetFunctionData = { args: jsResult.args, varDefs: jsResult.variableDefs }
    const inverseFunctionData = argsToVarDefs(state, currentObject, targetFunctionData, context.$attr)
    let functionData1 = { varDefs: [], args: {} }
    if (inverseAttr !== undefined){
        const inverseObject = objectFromHash(context[inverseAttr]) //get the inverse value
        functionData1 = argsToVarDefs(state, inverseObject , targetFunctionData, context.$attr)
    }

    if (jsResult.type === UNDEFINED) {
        console.warn('adding recursive function', currentObject, searchName)
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
}

const reduceGetStack = (state, currentObject, searchArgData) => { // get all args and varDefs of an argument
    //iteratively get the getStack[0] attribute of current object to find the end of the stack
    const { query, getStack } = searchArgData
    //limiter(4000, 100)
    const searchName = getName(state, currentObject)
    //console.log('name:', searchName, 'query:', query, currentObject, searchArgData)
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
        .filter((arg) => (arg[1].type === LOCAL_SEARCH))
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
const checkDuplicates = (str, varDefs) => {
    varDefs = varDefs || []
    let duplicates = []
    varDefs.forEach((varDef)=>{
        const key = varDef.key
        duplicates = duplicates.concat(varDefs.filter((varDef1) => (varDef1.key === key)))
    })
    console.log(str, duplicates, varDefs)
}

//if an an argument is defined entirely under the current object in the tree then it is considered
//resolved and is added to variableDefs
const argsToVarDefs = (state, currentObject, functionDataWithInverse, attr) => { //test if the args in functionData are resolved...return
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    console.group(`${attr} is ${getName(state, currentObject)}`)
    //if (attr === 'rootObject'){throw new Error('duplicate')}
    const functionData = resolveInverses(state, functionDataWithInverse, attr)//varDefs just pass through
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
    console.groupEnd()
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
