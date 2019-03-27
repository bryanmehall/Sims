/* eslint pure/pure: 2 */
import { deleteKeys, compileToJS, objectFromEntries } from './utils'
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE, THIS, UNDEFINED, STATE_ARG } from './constants'
import { primitives } from './primitives'
import { astToFunctionTable, buildFunction, getStateArgs } from './IRutils'
import { getValue, getName, getHash, getObject, hasAttribute, objectFromHash, getInverseAttr } from './objectUtils'
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

const combineArgs = (childPrims, childArgs) => {

    childPrims.forEach((arg) => {
        if (typeof arg === 'undefined'){
            throw new Error("LynxError: arg is undefined")
        }
    })
    const reduced = childPrims.reduce((combined, prim) => (

    /*const argsWithContext = Object.entries(prim.args).reduce((args, entry, i)=>{
        const attr = childArgs[i]

        return {...args, argWithContext}
    },{})*/
        //add warning here for overwriting property
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

function createStateArg(state, currentObject, argKey) {
    const statePrimitive = primitives.state(state, currentObject)
    const hash = currentObject.props.hash
    const ast = getValue(state, 'placeholder', 'jsPrimitive', currentObject).value

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
    const { argKey, getStack, context, newContext } = searchArgData
    const searchName = getName(state, currentObject) //remove for debug
    const nextGet = getStack[0]
    const newGetStack = getStack.slice(1)
    const attr = nextGet.props.attribute//attribute to go to
    const isInverseAttr = currentObject.hasOwnProperty('inverses') ? currentObject.inverses.hasOwnProperty(attr) : false
    //search through context to see if the current attr from the get stack matches any of the first attrs from the context
    //if it does then return the
    const contextFunctionArray = newContext.map((contextPath) => {
        if (contextPath.attr === attr){
            console.log(contextPath.attr)
            const newSearchArgs = { ...searchArgData, query: THIS, getStack: newGetStack }
            const nextValue = objectFromHash(contextPath.value)//todo: replace this with non objectTable version
            const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs) //think of this as getting the child args
            const returnFunctionData = argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
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


    if (isInverseAttr){
        //if the attribute is inverse return an inverse arg that only matches
        if (!hasAttribute(currentObject, attr)) {
            throw new Error('LynxError: attribute not found')
        }

        const newSearchArgs = { argKey: argKey, query: attr, type: INVERSE, context, newContext, getStack: getStack }//don't slice get stack here --slice it when evaluating inverse arg
        //does this indicate a bigger problem with off by one errors? some functions work on current, some work on next
        return { args: { [argKey]: newSearchArgs }, varDefs: [] }
    } else if (attr === 'previousState'){
        return createStateArg(state, currentObject, argKey);
    }
    //the next section is for allowing objects referenced by a get to have inverse attributes
    //if nextGet has any attributes other than those listed
    //then get inverses to add to nextValue
    const extraAttrs = ['jsPrimitive', 'rootObject', 'attribute', 'parentValue', 'hash']
    const inverseAttributes = deleteKeys(nextGet.props, extraAttrs)
    const hasInverses = Object.keys(inverseAttributes).length !== 0
    const inverses = 'placeholder'//hasInverses ? inverseAttributes : 'placeholder'
    //get the next value with inverses from cross edge attached
    const { value: nextValue } = getValue(state, inverses, attr, currentObject) //evaluate attr of currentobject
    const { value: nextJSValue } = getValue(state, 'placeholder', 'jsPrimitive', nextValue)
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
        const getData = argsToVarDefs(state, currentObject, getFunctionData, attr)
        return getData
    } else {
        const newSearchArgs = { ...searchArgData, query: THIS, getStack: newGetStack }
        const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs) //think of this as getting the child args
        const returnFunctionData = argsToVarDefs(state, currentObject, nextValueFunctionData, attr)
        return returnFunctionData
    }
}
//the end of the get path is the target object

const createVarDef = (state, currentObject, searchArgData) => {
    const { argKey, newContext } = searchArgData
    //get primitve of
    const { value: jsResult } = getValue(state, 'placeholder', 'jsPrimitive', currentObject)
    const inverseAttr = newContext[0].attr //todo: need to loop through context
    //add context to all resulting arguments
    const args = typeof jsResult.args ==='undefined' ? {} : jsResult.args
    const argsWithContext = Object.entries(args)
        .filter((arg) => arg[0] !== 'prim')
        .reduce((args, entry) => {
            const targetContext = entry[1].newContext || [] //if newContext is undefined
            const appendedContext = targetContext.concat(newContext)
            const argWithAppendedContext = { ...{}, ...entry[1], newContext: appendedContext }
            return {...{}, ...args, [entry[0]]: argWithAppendedContext }
        }, {})
    if (args.hasOwnProperty('prim')) {
        Object.assign(argsWithContext, { prim: true })
        //get rid of prim when refactoring? it isn't part of the main rendering monad
    }
    const targetFunctionData = { args: argsWithContext, varDefs: jsResult.variableDefs }
    //console.log(argKey, newContext, currentObject, targetFunctionData)

    const inverseFunctionData = argsToVarDefs(state, currentObject, targetFunctionData, inverseAttr)
    const searchName = getName(state, currentObject) //remove for debug
    if (jsResult.type === UNDEFINED) {
        console.warn('adding recursive function', currentObject, searchName)
        //throw new Error('recursive')
        return { args: {}, varDefs: [] }
    } else {
        const variableDefinition = {
            key: argKey,
            varDefKey: jsResult.hash,
            ast: Object.assign({}, jsResult, {args, varDefs:inverseFunctionData.varDefs}),
            string: jsResult.string,
            comment: `//${searchName}`
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
            //console.log(searchArgData, currentObject)
            return getNext(state, currentObject, searchArgData)

            //const inverseAttr = getInverseAttr(state, attr)
            //console.log(currentObject, inverseAttr)
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
            newContext: searchArg[1].newContext,
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
let console1 = false
const argsToVarDefs = (state, currentObject, functionDataWithInverse, attr) => { //test if the args in functionData are resolved...return
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    //console.group(`${attr} is ${getName(state, currentObject)}`)
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
    //console.groupEnd()


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

/*returns:
    list of outputs
        input list
        function to calculate value
        function table (for reducing)
        dbSearch?

*/
const compileOutput = (state, ast, outputs) => { //get rid of dependence on state?
    //ast is undefined if state arg has already been created
    //outputs will have own property if output has already been created
    if (typeof ast === 'undefined' || outputs.hasOwnProperty(ast.hash)){
        return {}
    }
    const dbASTs = resolveDBSearches(state, ast.args) //get all db searches from ast args
    const stateArgs = getStateArgs(ast) //get all state args from ast
    const varDefs = ast.variableDefs.concat(dbASTs) //add db varDefs to ast varDefs
    const astWithDB = Object.assign({}, ast, { variableDefs: varDefs }) //combine these new varDefs with ast
    const functionTable = astToFunctionTable(astWithDB) //create function table from ast
    const outputString = buildFunction(astWithDB).string //create top level function for ast
    const valueFunction = compileToJS(['functionTable', 'inputs'], `${outputString}`)//add inputs here
    //recursively call compile output for state and then combine the results to this output
    const newOutputs = Object.assign({}, outputs, { [ast.hash]: { functionTable, valueFunction, ast, stateArgs } }) //get rid of ast and state args
    /*const newOutputsWithState = stateArgs.reduce((currentOutputs, stateArg) => {
        console.log(stateArg)
        return Object.assign(currentOutputs, compileOutput(state, stateArg.ast, newOutputs))
    }, newOutputs)*/
    return newOutputs//WithState
}

const combineFunctionTables = (outputs) => ( //for an object of outputs, combine their function tables into one
    Object.values(outputs).reduce((functionTable, output) => {
        return Object.assign(functionTable, output.functionTable)
    }, {})
)

//compile a module...right now this only does app
export const compile = (state) => {
    const hashTable = Object.values(state.sim.object).reduce((hashTable, obj) => {
        const hash = getHash(obj)
        const objWithHash = {...obj, hash}
        return Object.assign(hashTable, { [hash]: objWithHash })
    }, {}) //get hash table for visualization

    const appData = getObject(state, 'app')

    ///const appHash = getHash(appData)
    //const appDataWithHash = Object.assign({}, appData, { props: Object.assign({}, appData.props, { hash: appHash }) })
    const { value: appAST } = getValue(state, 'app', 'jsPrimitive', appData)//WithHash)
    const outputs = compileOutput(state, appAST, {})
    const functionTable = combineFunctionTables(outputs)
    //console.log(outputs, functionTable)
    return {
        renderMonad: outputs.apphash.valueFunction,
        functionTable,  ast:outputs.apphash.ast,
        objectTable: hashTable,
        stateArgs: outputs.apphash.stateArgs }
}
