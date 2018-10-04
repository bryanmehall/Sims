import { combineArgs, getName, convertToSearchArgs } from './selectors'
import { getValue } from './objectUtils'
import { THIS } from './constants'

const isNotPrimitive = (objectData) => (
    !hasProperty(objectData, 'jsPrimitive')
)

const isInverse = (objectData, propName) => (
    objectData.hasOwnProperty('inverses') ? objectData.inverses.hasOwnProperty(propName) : false
)

const isResolved = (arg, name) => (
    arg.query === name || arg.query === THIS || arg.query === '$resolved'
)
const isNotResolved = (arg, name) => (
    !isResolved(arg, name) //catches local search args that do not match and all other args
)

const createVarDef = () => {

}
const getArgsAndVarDefs = (state, objectData, childArgs) => {
    const cominedArgs = combineArgs(childArgs)
    const name = getName(objectData)
    //all matching argumants
    const matchingArgs = combinedArgs.filter((arg) => isResolved(arg, name))
    //arguments that don't match so they are not resolved
    const unresolvedArgs = combinedArgs.filter((arg) => isNotResolved(arg, name))

    const pathArgsAndVarDefs = matchingArgs.map((arg) => (evaluatePath(state, objectData, arg)))
    //combine unresolvedArgs with pathArgsAndVarDefs
}

const evaluatePath = (state, objectData, arg) => {
    const nextAttribute = getStack[0].props.attribute
    const newGetStack = getStack.slice(1)
    const nextValue = getValue(state, 'placeholder', nextAttribute, objectData)
    if (getStack.length === 0){
        return { args: {}, varDefs: createVarDef() }
    } else if (isInverse (objectData, nextAttribute)) {
        const changes = { query: THIS, getStack:newGetStack}
        return getArgsAndVarDefs(state, nextValue, Object.assign({}, arg, changes) )
    } else if (isNotPrimitive(objectData)){
        const changes = {query:'$resolved', getStack:newGetStack}
        return getArgsAndVarDefs(state, nextValue, Object.assign({}, arg, changes) )
    } else if( isLocalGet(objectData)){
        return
    } else if (isGlobalGet(objectData)){

    } else {//is a primitive

    }
}
