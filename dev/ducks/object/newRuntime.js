import { lynxParser } from "../../lynxParser"
import { flattenState } from "./assembler"
import { objectFromName, getPath, getValue } from "./objectUtils"

export const initRuntime = (lynxText, canvas, updateDebug) => {
    let hashTable = flattenState(lynxParser(lynxText))
    const canvasContext = canvas.getContext('2d')
    let { inputs, outputs } = initIO(hashTable)
    const runEvent = (event) => { //what happens when the next event comes before this is done? blocking? 
        inputs.set(event.valueName, event.value)
        const result = runtimeLoop(hashTable, inputs, outputs, canvasContext, updateDebug)
        
    }
    addEventListeners(canvas, runEvent)

    runtimeLoop(hashTable, inputs, outputs, canvasContext, updateDebug)
}

const runtimeLoop = (hashTable, inputs, outputs, canvasContext, updateDebug) => {
    outputs.forEach((output) => { output.hook(inputs, output, hashTable, canvasContext) })
    updateDebug(hashTable)
    return { inputs, outputs, hashTable }
}

const addEventListeners = (canvas, runEvent) => {
    canvas.addEventListener('mousedown', () => {
        const event =  { name: 'mouseDown', valueName: 'mouseDown', value: true }
        runEvent(event)
    })
    canvas.addEventListener('mouseup', () => {
        const event =  { name: 'mouseDown', valueName: 'mouseDown', value: false }
        runEvent(event)
    })
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
}



const initIO = (hashTable) => {
    const inputs = new Map([ //inputs are in the form (key, value)
        ['mousePos', { x: 0, y: 0 }], //TODO: add support for undefined
        ['mouseDown', false]

    ])
    const appObject = objectFromName(hashTable, 'app')
    hashTable.inputs = inputs //state must have inputs for check
    const canvasRepVC = getPath(hashTable, ['graphicalRepresentation', 'canvasRep', 'equalTo'], appObject, [[]])
    const windowOutput = { ...canvasRepVC, hook: outputHooks.render } //how do you content address these (the context)?
    const outputs = new Map([ //outputs are in the form (key, {context, value, hook?})
        ['window', windowOutput] //TODO:replace this key with object instead of "window"
    ])
    return { inputs, outputs }
}

const outputHooks = {
    render: (inputs, output, hashTable, canvasContext) => {
        //make canvasRep an array of [{op:text, }, {op:setFill, }...] ?
        //do diffs (and clearing) between previosFrame and nextFrmae in lynx
        canvasContext.clearRect(0,0,300,300) //FIXME: canvas.width
        hashTable.inputs = inputs
        const canvasRep = getValue(hashTable, 'jsRep', output.value, output.context)
        const renderFunction = new Function('ctx', canvasRep)
        
        renderFunction(canvasContext)
    },
    state: (output) => (output)
}
