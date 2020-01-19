import { lynxParser } from "../../lynxParser"
import { getValue } from "./objectUtils"

export const initRuntime = (lynxString, canvas) => {
    const hashTable = lynxParser(lynxString)
    const canvasContext = canvas.getContext('2d')
    runtimeLoop(hashTable, {}, canvasContext)
}

const runtimeLoop = (hashTable, inputs, canvasContext, windowObject) => {
    const canvasRep = getValue(hashTable, 'canvasRep', windowObject) //make canvasRep an array of [{op:text, }, {op:setFill, }...]
    render(canvasContext, canvasRep)
    window.requestAnimationFrame()
    runtimeLoop(hashTable, inputs, canvasContext)
}

const render = (canvasContext, canvasRep) => {
    
}