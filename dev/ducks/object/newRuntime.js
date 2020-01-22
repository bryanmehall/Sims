import { lynxParser } from "../../lynxParser"
import { flattenState } from "./assembler"
import { objectFromName, getPath } from "./objectUtils"

export const initRuntime = (lynxText, canvas, updateDebug) => {
    const hashTable = flattenState(lynxParser(lynxText))
    const windowObject = objectFromName(hashTable, 'window') 
    const canvasContext = canvas.getContext('2d')
    addEventListeners(canvas)
    runtimeLoop(hashTable, {}, canvasContext, windowObject, updateDebug)
}

const runtimeLoop = (hashTable, inputs, canvasContext, windowObject, updateDebug) => {
    //make canvasRep an array of [{op:text, }, {op:setFill, }...] ?
    const canvasRep = getPath(hashTable, ['canvasRep', 'equalTo', 'jsRep'], windowObject, [[]]).value.value
    updateDebug(hashTable)
    render(canvasContext, canvasRep)
    //window.requestAnimationFrame()
    //runtimeLoop(hashTable, inputs, canvasContext)
}

const render = (canvasContext, canvasRep) => {
    const renderFunction = new Function('ctx', canvasRep)
    renderFunction(canvasContext)
}

const addEventListeners = (canvas) => {
    canvas.addEventListener('mousedown', () => { runEvent({ name: 'mouseDown', value: "true" }) })
    canvas.addEventListener('mouseup', () => { runEvent({ name: 'mouseUp', value: "false" }) })
    canvas.addEventListener('mousemove', (e) => { 
        runEvent({ 
            name: 'mouseMove', 
            value: {
                x: e.pageX - e.currentTarget.offsetLeft || 0,
                y: e.pageY - e.currentTarget.offsetTop || 0
            } 
        }) 
    })//concurrent updates in object
}
const runEvent = (event) => {
    console.log(event)
}
