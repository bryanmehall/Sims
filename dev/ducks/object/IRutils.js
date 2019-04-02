import { compileToJS } from './utils'
import { jsCompilers } from './jsCompiler'
import { STATE_ARG } from './constants'

//build string of function from ast node and add that function to the function table
export const buildFunction = (ast) => {
    checkAST(ast)
    const string = jsCompilers[ast.type](ast)

    if (ast.inline && !ast.isFunction){
        return { string , newFunctionTable: {} }
    } else {
        const argsList = Object.keys(ast.args)
            .concat('functionTable')//list of child args
        try {
            const func = string.hasOwnProperty('varDefs') ?
                compileToJS(argsList, `${string.varDefs} return ${string.returnStatement}`) :
                compileToJS(argsList, string)
            const newFunctionTable = { [ast.hash]: func }
            if (ast.isFunction){
                return {
                    string: `functionTable.${ast.hash}`,
                    newFunctionTable
                }
            }
            return {
                string: `functionTable.${ast.hash}(${argsList.join(",")})`,
                newFunctionTable
            }
        } catch (e) {
            console.log('compiled function syntax error', ast, string, e)
            throw new Error('Lynx Compiler Error: function has invalid syntax')
        }
    }
}

export const astToFunctionTable = (ast) => {
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

export const getStateArgs = (ast) => {
    const stateArgs = Object.values(ast.args).filter((arg) => (arg.type === STATE_ARG))
    return stateArgs
}

const checkASTs = (asts, objectTable) => {
    asts.forEach(((ast) => {
        if (ast === undefined){ throw JSON.stringify(objectTable) }
    }))
}

export const checkAST = (ast) => {
    if (ast === undefined) {
        throw new Error("ast is undefined")
    } else if (!jsCompilers.hasOwnProperty(ast.type)){
        throw new Error(`LynxError: compiler does not have type ${ast.type}`)
    }
}
