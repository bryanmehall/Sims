/* eslint pure/pure: 2 */
import { jsCompilers } from './jsCompiler'
import { formatGetLog, formatDBSearchLog, deleteKeys, checkASTs } from './utils'
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

const astToFunctionTable = (ast) => {

    const children = ast.children
    const childASTs = Object.values(children)
    checkASTs(childASTs, ast)
    const childTables = childASTs.map(astToFunctionTable)

    const varDefs = ast.variableDefs || []
    const varDefASTs = varDefs.map((varDef) => (varDef.ast))
    checkASTs(varDefASTs, ast)
    const varDefTables = varDefASTs.map(astToFunctionTable)

    const newFunctionTable = ast.type === 'app' ? {} : buildFunction(ast).newFunctionTable
    const functionTable = Object.assign(newFunctionTable, ...varDefTables, ...childTables)
    return functionTable
}

const checkAST = (ast) => {
    if (ast === undefined) {
        throw new Error("ast is undefined")
    } else if (!jsCompilers.hasOwnProperty(ast.type)){
        throw new Error(`LynxError: compiler does not have type ${ast.type}`)
    }
}

//build string of function from ast node and add that function to the function table
export const buildFunction = (ast) => {
    checkAST(ast)
    const string = jsCompilers[ast.type](ast)
    if (ast.inline){
        return { string , newFunctionTable: {} }
    } else {
        const argsList = Object.keys(ast.args).concat('functionTable')
        try {
            const func = string.hasOwnProperty('varDefs') ?
                new Function(argsList, `${string.varDefs} return ${string.returnStatement}`) :
                new Function(argsList, '\t return '+string)
            const newFunctionTable = { [ast.hash]: func }
            if (ast.isFunction){
                return {
                    string: `functionTable.${ast.hash}`,
                    newFunctionTable
                }
            }
            return {
                string: `\tfunctionTable.${ast.hash}(${argsList.join(",")})`,
                newFunctionTable
            }
        } catch (e) {
            console.log('compiled function syntax error', ast, string)
            throw new Error('Lynx Compiler Error: function has invalid syntax')
        }
    }
}

function reduceGetStack(state, currentObject, searchArgData, searchName){
    //iteratively get the getStack[0] attribute of current object to find the end of the stack
    const { argKey, query, getStack, type } = searchArgData
    //limiter(2000000, 100)
    console.log('name:', searchName, 'query:',query, currentObject, searchArgData)
    if (searchName === query || query === "$this"){ //this is a shim for objects that always match. $ is to prevent accidental matches
        if (getStack.length === 0){
            const { value: jsResult } = getValue(state, 'placeholder', 'jsPrimitive', currentObject)
            if (jsResult.type === 'undef') {
                console.log('adding recursive function', currentObject, searchName)
                //throw new Error('recursive')
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
            const nextName = getName(state, nextValue)
            if (nextJSValue.type === 'undef'){ //next value does not have primitive
                const newSearchArgs = { argKey, query, getStack: newGetStack }
                console.log(`${nextName} is not a primitive`, currentObject, nextValue)
                const nextValueFunctionData = reduceGetStack(state, nextValue, newSearchArgs, searchName)
                //handle case where nextName === query returned...need to move arg to varDef
                const childArgs = argsToVarDefs(state, currentObject, nextValueFunctionData, nextValueFunctionData.args, currentName)
                return childArgs
            } else if (nextJSValue.type === 'dbSearch') {//combine this with local get handler below?
                console.log('dbSearch')
                const {query, root, ast} = getDBsearchAst(state, nextValue, newGetStack)
                console.log(ast)
                const { variableDefs, args } = foldPrimitive(state, [ast], root)
                const dbSearchArg = { [nextValue.props.hash]: {
                        query,
                        hash: nextValue.props.hash,
                        type: 'dbSearch',
                        getStack: newGetStack,
                        searchContext: nextValue.inverses //switch to context
                    } }
                const combinedArgs = Object.assign(args, dbSearchArg)
                console.log(`the args of the db Search are dbSearchArg: ${nextValue.props.hash}`, args)
                return {
                    args:args ,
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
                const newSearchArgs = { argKey, query: childQuery, getStack: combinedGetStack }
                console.log('getting', formatGetLog(childQuery, combinedGetStack))
                return reduceGetStack(state, currentObject, newSearchArgs, currentName)
            } else {
                const newSearchArgs = { argKey, query, getStack: newGetStack }
                return reduceGetStack(state, nextValue, newSearchArgs, searchName)
            }
        }
    } else {
        if (searchName === 'app'){
            if (searchArgData.type === 'dbSearch'){
                return { args: {}, varDefs: [] }
            }
            console.warn(`LynxError: no match found for query "${query}"\n Traceback:`)
        }
        return { args: {}, varDefs: [] }//this just doesn't move any args, it doesn't mean that there are not any
    }
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

/*
convert args in the form {argKey:{query:"query" getStack:[]}}
to searchArgs in the form:[{argKey, query, getStack}]
*/
export const convertToSearchArgs = (args) => {
    return Object.entries(args)
        .filter((arg) => (arg[1].type === 'localSearch'))
        .map((searchArg) => ({ //unpack from object.entries form
            argKey: searchArg[0],
            query: searchArg[1].query,
            getStack: searchArg[1].getStack
        }))
}

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

//convert object of arguments to object of unresolved args and list of variable defs
//if an an argument is defined entirely under the current object in the tree then it is considered
//resolved and is added to variableDefs
const argsToVarDefs = (state, currentObject, functionData, combinedArgs, objName) => {
    //get args that are searches into list of pairs [argKey, argValue]
    //for each searchArg, test if the query matches the name of the current object
    //if it does, the search is resolved, if not, pass it up the tree
    const objectName = objName || getName(state, currentObject)
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
    })
    //remove above and change functionDataWithDBDefs functionData
    const resolvedFunctionData = convertToSearchArgs(combinedArgs)
        .map((searchArgData) => {
            console.log(`reducing get stack: ${formatGetLog(searchArgData.query, searchArgData.getStack)} with name: ${objectName} `)
            const reduced = reduceGetStack(state, currentObject, searchArgData, objectName)
            if (reduced.args.hasOwnProperty('recursive')){ //handle struct primitives
                console.log('recursive', combinedArgs, objectName, getName(state, currentObject))
                //throw 'recursive'
            }
            return reduced
        })
        .reduce(reduceFunctionData, functionDataWithDBDefs)
    return resolvedFunctionData
}

export const foldPrimitive = (state, childASTs, currentObject) => { //list of child objects in the form [{string:..., args:...}]
    const combinedArgs = combineArgs(childASTs)//combine arguments of sub functions
    const initialFunctionData = { args: combinedArgs, varDefs: [] } //search args moves resolved defs from args to varDefs
    const { args, varDefs } = argsToVarDefs(state, currentObject, initialFunctionData, combinedArgs)
    return { args, variableDefs: varDefs }
}

export const compile = (state) => {
    const appData = getObject(state, 'app')
    const { value: display } = getValue(state, 'app', 'jsPrimitive', appData)
    if (display === undefined){throw 'display is undefined'}
    const functionTable = astToFunctionTable(display)
    const appString = jsCompilers.app(display)
    const renderMonad = new Function('functionTable', `${appString}`)//returns a thunk with all of render information enclosed
    return { renderMonad, functionTable, ast: display, objectTable: {} }
}

const resolveDBSearches = (state, combinedArgs) => { //move db searches at app to variable defs
    return Object.values(combinedArgs)
        .filter((arg) => {
            return arg.type === 'dbSearch' || arg.type === 'globalGet'}//combine these conditions
        )
        .map((arg) => {
            let  root = getObject(state, arg.query)
            root.props.parentValue = 'parent' //this prop must be set before the hash prop to keep the order of props consistent
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
