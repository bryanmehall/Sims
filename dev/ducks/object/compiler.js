import { compileToJS } from './utils'
import { astToFunctionTable, buildFunction, getStateArgs } from './IRutils'
import { getValue, getHash, getObject, objectFromName } from './objectUtils'
import { resolveDBSearches } from './DBsearchUtils'

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
    return newOutputs// aWithState
}

const combineFunctionTables = (outputs) => ( //for an object of outputs, combine their function tables into one
    Object.values(outputs).reduce((functionTable, output) => (
        Object.assign(functionTable, output.functionTable)
    ), {})
)


//compile a module...right now this only does app
export const compile = (state) => {
    const hashTable = Object.values(state).reduce((hashTable, obj) => {
        const hash = getHash(obj)
        const objWithHash = { ...obj, hash }
        return Object.assign(hashTable, { [hash]: objWithHash })
    }, {})
    const appData = objectFromName(hashTable, 'app')
    //const appDataWithHash = Object.assign({}, appData, { props: Object.assign({}, appData.props, { hash: appHash }) })
    const { value: appAST } = getValue(hashTable, 'jsPrimitive', appData)//aWithHash)
    const outputs = compileOutput(hashTable, appAST, {})
    const functionTable = combineFunctionTables(outputs)
    //console.log(outputs, functionTable)
    return {
        renderMonad: outputs.apphash.valueFunction,
        functionTable,
        ast: outputs.apphash.ast,
        objectTable: hashTable,
        stateArgs: outputs.apphash.stateArgs }
}
