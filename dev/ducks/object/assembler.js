import { astToFunctionTable, buildFunction, getStateArgs } from './IRutils'
import { getHash } from './hashUtils'
import { resolveDBSearches } from './DBsearchUtils'
import { INTERMEDIATE_REP, GET_HASH, JS_REP } from './constants'

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


const attrConstants = ['get']
//take state indexed by name and return a hash table
//for every nested tree, flatten the tree and index by hash
export const flattenState = (state) => {
    const hashTable = Object.entries(state).reduce((hashTable, entry) => {
        const name = entry[0]
        const obj = entry[1]
        const objWithHashValues = replaceNamesWithHashes(state, obj)
        const hash = getHash(objWithHashValues) //include hash of each module
        if (attrConstants.includes(name) && hash !== GET_HASH){
            throw new Error('get hash does not match '+hash)
        }
        const hashes = getHashesFromTree(objWithHashValues, state)
        return Object.assign(hashTable, hashes, { [hash]: objWithHashValues })
    }, {})
    return hashTable
}
const exemptProps = [INTERMEDIATE_REP, JS_REP, 'jsPrimitive', "initialObjectType", "attribute"]

const replaceNamesWithHashes = (state, object) => (
    Object.fromEntries(Object.entries(object)
        .map((entry) => {
            const attr = entry[0]
            const value = entry[1]
            if (exemptProps.includes(attr)){
                return [attr, value]
            } else if (typeof value === 'string'){
                const hash = getHash(replaceNamesWithHashes(state, state[value]))
                return [attr, hash]
            } else {
                return [attr, replaceNamesWithHashes(state, value)]
            }
        })
    )
)
export const getHashesFromTree = (objectData, state) => ( //for each module
    Object.entries(objectData)
        .reduce((hashTable, entry) => {
            let value = entry[1]
            const hash = getHash(value)
            if (typeof value === 'string') {
                return hashTable
            } else {
                return Object.assign(hashTable, getHashesFromTree(value, state), { [hash]: value })
            }
        }, {})
)
