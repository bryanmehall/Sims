import { lynxParser } from "../../lynxParser"
import { flattenState } from "./assembler"
import { objectFromName, getPath, getValueAndContext, getValue } from "./objectUtils"
import { filterOutputs } from './utils'
import { traceState } from "./constants"

export const initRuntime = (lynxText, canvas, updateDebug) => {
    let hashTable = flattenState(lynxParser(lynxText))
    const canvasContext = canvas.getContext('2d')
    let { inputs, outputs } = initIO(hashTable)
    let state = { ...hashTable, inputs, outputs }
    const runEvent = (event) => { //what happens when the next event comes before this is done? blocking? 
        const newInputs = Object.assign({}, state.inputs, { [event.valueName]: event.value })
        const stateWithInputs = Object.assign({}, state, { inputs: newInputs })
        state = runtimeLoop(stateWithInputs, canvasContext, updateDebug) //BUG: this creaets a race condition?
        
    }
    addEventListeners(canvas, runEvent)
    state = runtimeLoop(state, canvasContext, updateDebug)
}

const runtimeLoop = (state, canvasContext, updateDebug) => {
    const renderOutput = filterOutputs(state.outputs, "render")
    const stateWithMergedInputs = mergeStateInputs(state)
    const outputValues = Object.entries(renderOutput).map(([key, output]) => (
        outputHooks[output.hook](key, output, stateWithMergedInputs, canvasContext)
    ))
    //TODO: combine these states and outputs
    return outputValues[0]
    //updateDebug(hashTable)
}


const mergeStateInputs = (state) => {
    const stateOutputs = filterOutputs(state.outputs, "state") //REFACTOR: so this is a matching function for negatives
    //if (traceState){ logOutputs(stateOutputs) }
    const inputsWithState = { ...state.inputs, ...stateOutputs }
    const renderOutputs = filterOutputs(state.outputs, "render")
    return { ...{}, ...state, outputs: renderOutputs, inputs: inputsWithState }

}

const addEventListeners = (canvas, runEvent) => {
    canvas.addEventListener('mousedown', () => {
        const event =  { name: 'mouseDown', valueName: 'mouseDown', value: true }
        runEvent(event)
    })
    canvas.addEventListener('mouseup', () => {
        const event =  { name: 'mouseDown', valueName: 'mouseDown', value: false }
        runEvent(event)
    })/*
    canvas.addEventListener('mousemove', (e) => {
        const event = {
            name: 'mouseMove',
            valueName: 'mousePos',
            value: {
                x: e.pageX - e.currentTarget.offsetLeft || 0,
                y: e.pageY - e.currentTarget.offsetTop || 0
            }
        }
        runEvent(event)
    }) //concurrent updates in object
    */
}



const initIO = (hashTable) => {
    const inputs = { //inputs are in the form (key, value)
        mousePos: { x: 0, y: 0 }, //TODO: add support for undefined
        mouseDown: false
    }
    const outputs = {}
    const appObject = objectFromName(hashTable, 'app')
    hashTable.inputs = inputs //state must have inputs for check
    hashTable.outputs = outputs
    const canvasRepVC = getPath(hashTable, ['graphicalRepresentation', 'canvasRep', 'equalTo'], appObject, [[]])
    const windowOutput = { ...canvasRepVC, hook: "render" } //how do you content address these (the definition)?
     //outputs are in the form (key, {context, value, hook?})
    Object.assign(outputs, { window: windowOutput }) //TODO:replace this key with hash instead of "window"
    return { inputs, outputs }
}

const outputHooks = { //functions with side effects
    render: (key, output, state, canvasContext) => {
        //make canvasRep an array of [{op:text, }, {op:setFill, }...] ?
        //do diffs (and clearing) between previousFrame and nextFrmae in lynx
        canvasContext.clearRect(0,0,300,300) //FIXME: canvas.width
        const canvasRep = getValueAndContext(state, 'jsRep', output.value, output.context)
        const renderFunction = new Function('ctx', canvasRep.value)
        renderFunction(canvasContext)
        console.warn(canvasRep.value)
        return canvasRep.state
    }
}
