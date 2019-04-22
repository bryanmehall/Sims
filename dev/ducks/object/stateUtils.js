import { STATE_ARG } from './constants'
import { primitives } from './primitives'
import { getValue, getAttr } from './objectUtils'
import { argsToVarDefs } from './selectors'
import { objectFromEntries } from './utils'

export const createStateArg = (state, currentObject, argKey) => {
    const statePrimitive = primitives.state(state, currentObject)
    const hash = getAttr(currentObject, 'hash')
    const ast = getValue(state, 'jsPrimitive', currentObject)
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
    const astVarDefs = ast.varDefs.concat(varDef)
    const arg = {
        hash,
        type: STATE_ARG,
        getStack: [],
        ast: Object.assign({}, ast, { args: astArgs, varDefs: astVarDefs }),
        searchContext: currentObject.inverses
    }
    return { args: { [hash]: arg }, varDefs: [varDef] }
}

/*
for resolving state args above the top of the state's ast
take all args,
filter out state args,
resolve function data on the ast of each state arg,
combine back into asts then back into state
*/
export const resolveStateASTs = (state, args, currentObject) => (
    Object.entries(args)
        .filter((entry) => (entry[1].type === STATE_ARG))
        .map((entry) => {
            const argKey = entry[0]
            const arg = entry[1]
            if (arg.hasOwnProperty('ast')){
                const ast = arg.ast
                const { args, varDefs } = argsToVarDefs(state, currentObject, { args: ast.args, varDefs: [] })
                const orderedVarDefs = varDefs.concat(ast.varDefs.reverse())//does  this reversing var defs work for the general case?
                const newAst = Object.assign({}, ast, { args, varDefs: orderedVarDefs })
                return [argKey, Object.assign({}, arg, { ast: newAst })]
            } else {
                return [argKey, arg]
            }
        })
        .reduce(objectFromEntries, {})
)
