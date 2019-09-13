import { astToFunctionTable, buildFunction, getStateArgs } from './IRutils'
import { getHash } from './objectUtils'
import { resolveDBSearches } from './DBsearchUtils'
import { INTERMEDIATE_REP } from './constants'

/*returns:
    list of outputs
        input list
        function to calculate value
        function table (for reducing)
        dbSearch?

*/
const assembleOutput = (state, ast, outputs) => { //get rid of dependence on state?
    //ast is undefined if state arg has already been created
    //outputs will have own property if output has already been created
    if (typeof ast === 'undefined' || outputs.hasOwnProperty(ast.hash)){
        return {}
    }
    const dbASTs = resolveDBSearches(state, ast.args) //get all db searches from ast args
    const stateArgs = getStateArgs(ast) //get all state args from ast
    const varDefs = ast.varDefs.concat(dbASTs) //add db varDefs to ast varDefs
    const astWithDB = Object.assign({}, ast, { varDefs }) //combine these new varDefs with ast
    astWithDB.inline = false //needed to force newFunctionTable to be defined
    const newOutput = {
        functionTable: astToFunctionTable(astWithDB), //create function table from ast,
        valueFunction: buildFunction(astWithDB).newFunctionTable[astWithDB.hash], //create top level function for ast
        ast,
        stateArgs
    }
    //recursively call compile output for state and then combine the results to this output

    const newOutputs = Object.assign({}, outputs, { [ast.hash]: newOutput }) //get rid of ast and state args
    const newOutputsWithState = stateArgs.reduce((currentOutputs, stateArg) => (
        Object.assign(currentOutputs, assembleOutput(state, stateArg.ast, newOutputs))
    ), newOutputs)
    return newOutputsWithState
}

const combineFunctionTables = (outputs) => ( //for an object of outputs, combine their function tables into one
    Object.values(outputs).reduce((functionTable, output) => (
        Object.assign(functionTable, output.functionTable)
    ), {})
)

//take state indexed by name and return a hash table
//for every nested tree, flatten the tree and index by hash
export const flattenState = (state) => {
    const hashTable = Object.values(state).reduce((hashTable, obj) => {
        const hash = getHash(obj)
        const objWithHash = obj//{ ...obj, hash }//remove this--hashes added in getHashesFromTree
        const hashes = getHashesFromTree(obj)
        return Object.assign(hashTable, hashes, { [hash]: objWithHash })
    }, {})
    return hashTable
}
export const getHashesFromTree = (objectData) => (
    Object.entries(objectData)
        .filter((entry) => (
            typeof entry[1] !== 'string' //is this filter needed? test without
        ))
        .reduce((hashTable, entry) => {
            const prop = entry[0]
            const value = entry[1]
            const hash = getHash(value)
            if (typeof value === 'string') {
                return hashTable
            } else if (prop === INTERMEDIATE_REP) {
                if (value.type === "array"){ //add hashes for elements of array --need to add map
                    return value.value.reduce((hashTable, element) => {
                        const elementHash = getHash(element)
                        const elementWithHash = { ...element, hash: elementHash }
                        const elementTable = getHashesFromTree(elementWithHash)
                        return Object.assign(hashTable, elementTable, { [elementHash]: elementWithHash })
                    }, {})
                } else {
                    return Object.assign(hashTable, { [hash]: value })
                }
            } else {
                return Object.assign(hashTable, getHashesFromTree(value), { [hash]: value })
            }
        }, {})
)

export const assemble = (hashTable, lynxIR) => {
    const outputs = assembleOutput(hashTable, lynxIR, {})
    const functionTable = combineFunctionTables(outputs)
    const mainOutput = lynxIR.hash
    return { functionTable, outputs, mainOutput }
}
