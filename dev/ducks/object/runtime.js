import { assemble, flattenState, getHashesFromTree } from './compiler'
import { getValue, objectFromName, getHash, getName, objectFromHash, tableContainsName } from './objectUtils'
import { INPUT, INTERMEDIATE_REP } from './constants'
import { lynxParser } from './../../lynxParser'
import { limiter, resetLimiter } from './utils'
//import { logFunctionTable } from './utils'

/*
    types of inputs:
        1. event (mouse)
            available until consumed
        2. continuous: (time)
            always avaliable
        3. state
            always available
    types of outputs:
        1. pull (animation frame)
            only open when requested
        2. push (state)
            always open
    hooks:
        hooks can be added to outputs so that custom javascript can be executed
        (these hooks should never be written in lynx so the compiled js is sandboxed)
    loops:
        if state depends on itself ie
    The runtime starts by taking the final output nodes(just render for now) and evaluating it. Keep track of the inputs that are needed.
    If it runs into a pre-compiled module then that is an input but the sub inputs for that module are not kept track of.


*/
//sim this.runtime
//pass value of output


const checkTypes = (type, vars) => {
    vars.forEach((variable) => {
        if (typeof variable !== type) {
            throw new Error(`Lynx typeError: type of ${variable} is not ${type}`)
        }
    })
}
function getInputValue(key){ //this can not use arrow notation because then the thisArg is not bound
    if (this.inputs.hasOwnProperty(key)) {
        return this.inputs[key].value
    } else {
        throw new Error(`LynxError: key:"${key}" not found in inputs`)
    }

}

const initInputs = (lynxText) => ({
    lynxTextInput: { available: true, value: lynxText },
    lynxTextInput1: { available: true, value: 'app.mouse.pos.x' },
    mouseDown: { available: false, value: false },
    mouseX: { available: false, value: 0 },
    mouseY: { available: false, value: 0 },
    currentKeys: { available: false, value: [] }
})

const getInputs = (runtime, output) => {
    const ast = output.ast
    const args = ast.args
    const inputs = Object.values(args)
        .map((arg) => {
            const inputName = arg.type === INPUT ? arg.name : arg.hash
            if (arg.type !== INPUT){ //if it is a state arg--move this to otuside of app module
                Object.assign(runtime.inputs, {
                    [arg.hash]: { available: true, value: "1" } //default value for state
                })
            }
            return inputName
        })
        .filter((input) => (typeof input !== 'undefined'))
    return inputs
}



export class Runtime {
    //all lynx state in handled by this runtime object
    constructor(lynxText, canvas, updateDebug) { //init state is the object table for now
        const runtime = this
        this.updateDebug = updateDebug
        this.outputs = {}
        //when calculating state, put state in buffer so that all outputs are concurrent
        this.stateBuffer = {}
        let lynxState = flattenState(lynxParser(lynxText))
        this.inputs = initInputs(lynxText)//this list must be complete
        this.state = {}//combine this and hashTable

        this.hashTable = Object.assign(lynxState, { runtime: this })

        this.externalFunctions = { //these external functions are not pure. they should be refactored into pure functions
            parse: (lynxString) => (runtime.parse(lynxString)),
            compile: (lynxObject) => (runtime.compile(lynxObject)),
            assemble: (lynxIR) => (runtime.assemble(lynxIR)),
            run: (lynxModule) => (runtime.run(lynxModule))
        }


        /*
        const appParse = objectFromName(lynxState, 'appParse')
        const appParseIR = getValue(lynxState, INTERMEDIATE_REP, appParse)
        const appParseHash = getHash(appParse)
        appParseIR.hash = appParseHash
        appParseIR.inline = false
        const appParseGen = assemble(lynxState, appParseIR)
        const appGenFunction = appParseGen.outputs[appParseHash].valueFunction
        Object.assign(appParseGen.functionTable, externalFunctions)
        const appModule = appGenFunction(lynxText, appParseGen.functionTable)
        */
        const evalIR = (lynxIR) => {
            const IRhash = getHash(lynxIR)
            lynxIR.hash = IRhash
            const assembledModule = assemble(runtime.hashTable, appIRGenIR) //get rid of lynxState here
            const valueFunction = assembledModule.outputs[IRhash].valueFunction
            Object.assign(appIRGen.functionTable, runtime.externalFunctions)
            const result = 'abc'

        }
        const appData = objectFromName(runtime.hashTable, 'appRoot')//getObject
        const appIRGenIR = getValue(runtime.hashTable, INTERMEDIATE_REP, appData) //get primitive
        const irGenHash = getHash(appIRGenIR)
        appIRGenIR.hash = irGenHash
        const appIRGen = assemble(runtime.hashTable, appIRGenIR)

        const appIRGenFunction = appIRGen.outputs[irGenHash].valueFunction
        Object.assign(appIRGen.functionTable, runtime.externalFunctions)
        const appModule = appIRGenFunction(lynxText, appIRGen.functionTable)

        this.functionTable = Object.assign(appModule.functionTable, runtime.externalFunctions)
        this.outputs = appModule.outputs

        const width = canvas.getBoundingClientRect().width //this assumes that the size won't change
        const height = canvas.getBoundingClientRect().height
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        const hooks = {
            render: (renderer) => {
                renderFunctions.clear()
                renderer(renderFunctions, runtime.inputs)
            },
            state: (value, hash) => {
                if (value === this.inputs[hash].value){
                    this.stateBuffer[hash] = { value, available: false, lock: false }
                } else {
                    //console.log(hash, value)
                    //limiter(1000, 20)
                    this.stateBuffer[hash] = { value, available: true, lock: false }
                    if (Array.isArray(this.outputs[hash].prevValues)) { //for debug only
                        this.outputs[hash].prevValues.push(value)
                    } else {
                       this.outputs[hash].prevValues = [value]
                    }
                    this.stateAvailable = true
                }

            }
        }

        Object.keys(this.outputs).forEach((outputKey) => {
            const output = this.outputs[outputKey]
            const ast = output.ast
            const inputs = getInputs(runtime, output)
            this.outputs[outputKey] = {
                evaluation: 'lazy',
                open: true,
                hash: ast.hash,
                ast,
                value: output.valueFunction,
                hook: ast.hash === 'apphash' ? hooks.render : hooks.state,
                inputs
            }
        }, this)
        canvas.addEventListener('mousemove', (e) => {
            const mouseX = e.pageX - e.currentTarget.offsetLeft || 0
            const mouseY = e.pageY - e.currentTarget.offsetTop || 0
            this.inputs.mouseX = { available: true, value: mouseX } //do not use available for detecting change
            this.inputs.mouseY = { available: true, value: mouseY }
            this.checkOutputs()
        })
        canvas.addEventListener('mousedown', () => {
            this.inputs.mouseDown = { available: true, value: true }
            this.checkOutputs()
        })
        canvas.addEventListener('mouseup', () => {
            this.inputs.mouseDown = { available: true, value: false }
            this.checkOutputs()
        })
        document.addEventListener('keydown', (e) => {
            if (e.key === "Tab" || e.key === "Space") {
                e.preventDefault() //prevent tab from capturing input and space from scrolling
            }
            this.inputs.currentKeys = { available: true, value: [e.key] } //make it possible to have multiple keys
            this.checkOutputs()
        })
        document.addEventListener('keyup', () => {
            this.inputs.currentKeys = { available: true, value: [] } //make this just pop the key up key out of the set
            this.checkOutputs()
        })

        const renderFunctions = {
            rect: (x,y,width, height,r,g,b) => {
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
                ctx.fillRect(x, y, width, height)
            },
            text: (x, y, innerText, r, g, b) => {
                const size = 18
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
                ctx.font = `${size}px monospace`
                checkTypes('number', [x,y,r,g,b])
                const str = typeof innerText === 'string' || typeof innerText === 'number' ? innerText.toString() : JSON.stringify(innerText, null, 2)
                str.split('\t')
                    .join('    ') //replace all tabs sith 4 spaces for display
                    .split('\n')
                    .forEach((line, i) => {
                        ctx.fillText(line, x, y+i*size)
                    })
            },
            line: (x1, y1, x2, y2) => {
                ctx.beginPath()
                ctx.moveTo(x1, y1)
                ctx.lineTo(x2, y2)
                ctx.stroke()
            },
            clear: () => {
                ctx.clearRect(0, 0, width, height)
            }
        }
        this.updateDebug(this)
        this.checkOutputs()
    }
    //check if any of "output"'s inputs are available
    inputAvailable(output){
        return output.inputs.some((name) => (this.inputs[name].available)) || output.inputs.length === 0
    }

    //for each output if it is available check inputs. if it has input available then run hook
    checkOutputs() {
        //pass 'this' to second parameter of forEach to define 'this' in callback
        Object.values(this.outputs).forEach(this.runOutput, this)
        //stateAvailable = Object.values(this.stateBuffer).some((input) => (input.avaliable))
        Object.assign(this.inputs, this.stateBuffer)
        Object.values(this.inputs).forEach((input) => {
            if (input.lock){
                input.lock = false
                input.available = false
            }
        }, this)

        this.stateBuffer = {}
        this.updateDebug(this) //show state of runtime to debug utils --remove for production
        if (this.stateAvailable){
            this.stateAvailable = false
            const next = () => (this.checkOutputs())
            setTimeout(next, 200)
        }


    }
    runOutput(output) {
        if (output.open){
            const inputAvailable = this.inputAvailable(output)
            if (inputAvailable){
                const args = output.inputs
                    .map(getInputValue, this)
                output.inputs.forEach((inputKey) => {
                    this.inputs[inputKey].lock = true
                }, this)
                const fnArgs = [...args, this.functionTable]
                const value = output.value.apply(null, fnArgs) //inputs go here
                output.hook(value, output.hash)
            }
        }
    }
    parse(lynxString) { //modify lynx state here (side effect)
        console.log('parse lynxString', lynxString)
        //console.time('parse')
        let hashTable = {}
        try {
            const parsed = lynxParser(lynxString)
            hashTable = flattenState(parsed) //returns hash table of objects--eventually this should be part of state
            Object.assign(this.hashTable, hashTable)
            const containsApp = tableContainsName(hashTable, 'app')
            if (containsApp){
                return objectFromName(hashTable, 'app')
            } else {
                //const key = Object.keys(hashTable)[0]
                //const obj = objectFromHash(hashTable, key)
                const hash = getHash(parsed)
                return Object.assign(parsed, {hash})

            }
        } catch (e) {
            console.warn(e)
            return 'parsing error'//return lynx error object
        }
        //console.timeEnd('parse')
    }
    compile(lynxObject){ //make compile accept a target. ie. canvas, js, GLSL, wasm
        console.log('compile lynxObject', lynxObject)
        resetLimiter()
        try {
            console.time('compile')
            //const name = getName(lynxState, lynxObject)
            const lynxIR = getValue(this.hashTable, INTERMEDIATE_REP, lynxObject) //this uses the global hash table --is this ok because there is still referential transparency? just not a guarantee that it is loaded
            console.timeEnd('compile')
            return lynxIR
        } catch (e){
            console.warn(e)
            return 'compile error'
        }
    }
    assemble(lynxIR) {
        console.log('assemble lynxIR', lynxIR)
        if (lynxIR.hasOwnProperty('args')){ //success condition-- make this more robust
            console.time('assemble')
            const lynxModule = assemble(this.hashTable, lynxIR)
            console.timeEnd('assemble')
            Object.assign(lynxModule.functionTable, this.externalFunctions)
            return lynxModule
        } else { //error condition
            return { functionTable: {}, outputs: {} }
        }
    }
    run(module) {//remove this?
        const outputs = Object.values(module.outputs)
        const runtime = this
        if (outputs.length === 0){
            return 'error'
        } else {
            const mainOutput = outputs[0]//make more robust
            const valueFunction = mainOutput.valueFunction
            const inputs = getInputs(runtime, mainOutput)
            const args = inputs
                .map(getInputValue, runtime)
            inputs.forEach((inputKey) => {
                this.inputs[inputKey].lock = true
            }, this)
            const fnArgs = [...args, module.functionTable]
            const value = valueFunction.apply(null, fnArgs)
            //console.log(value, valueFunction.toString())
            return value
        }
    }
}
