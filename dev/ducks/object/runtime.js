import { assemble, flattenState } from './assembler'
import { getValue, objectFromName, getValueAndContext } from './objectUtils'
import { createParentContext } from './contextUtils'
import { getHash } from './hashUtils'
import { INPUT, INTERMEDIATE_REP } from './constants'
import { lynxParser } from './../../lynxParser'
import { resetLimiter, isUndefined } from './utils'
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
function getInputValue(input){ //this can not use arrow notation because then the thisArg is not bound
    if (this.inputs.hasOwnProperty(input.name)) {
        return this.inputs[input.name].value
    } else {
        throw new Error(`LynxError: key:"${input.name}" not found in inputs`)
    }
}

const initInputs = (lynxText) => ({
    lynxTextInput:  { available: true,  value: lynxText },
    lynxTextInput1: { available: true,  value: 'app.mouse.pos.x' },
    mouseDown:      { available: false, value: false },
    mouseX:         { available: false, value: 0 },
    mouseY:         { available: false, value: 0 },
    currentKeys:    { available: false, value: [] }
})

const getInputs = (output) => {
    const ast = output.ast
    const args = ast.args
    const inputs = Object.values(args)
        .map((arg) => {
            const inputName = arg.type === INPUT ? arg.name : arg.hash
            //todo: replace with check that isDefinition is always true or false not undefined
            return { name: inputName, isDefinition: arg.isDefinition ? true : false }
        })
        .filter((input) => (typeof input !== 'undefined'))
    return inputs
}

const addInputsToRuntime = (runtime, output) => {
    const ast = output.ast
    const args = ast.args
    Object.values(args).forEach((arg) => {

        if (arg.type !== INPUT && !runtime.inputs.hasOwnProperty(arg.hash)){ //if it is a state arg--move this to otuside of app module
            let def = "1" //remove --require states to have default state
            if (arg.defaultState.hasOwnProperty("value")){
                def = arg.defaultState.value
            }
            Object.assign(runtime.inputs, {
                [arg.hash]: { available: true, value: def} //default value for state
            })
        }
    })
}


export class Runtime {
    //all lynx state in handled by this runtime object
    constructor(lynxText, canvas, updateDebug) { //init state is the object table for now
        const runtime = this
        this.updateDebug = updateDebug
        this.outputs = {}
        //when calculating state, put state in buffer so that all outputs are concurrent
        this.stateBuffer = {}
        this.lynxText = lynxText
        this.hashTable = { runtime: this }
        this.functionTable = {}
        this.inputs = initInputs(lynxText)//this list must be complete

        this.externalFunctions = { //these external functions are not pure. they should be refactored into pure functions
            parse: (lynxString, searchName) => (runtime.parse(lynxString, searchName)),
            compile: (lynxObject) => (runtime.compile(lynxObject)),
            assemble: (lynxIR) => (runtime.assemble(lynxIR)),
            run: (lynxModule) => (runtime.run(lynxModule))
        }
        const windowObject = this.parse(this.lynxText, 'window') //use generic lynx parse function---stte modification is handled in getValue
        const { value, context } = getValueAndContext(this.hashTable, "canvasRep", windowObject, [[]])
        const { value: value1, context: context1 } = getValueAndContext(this.hashTable, "equalTo", value, context)
        const canvasString = getValueAndContext(this.hashTable, "jsRep", value1, context1).value.value
        console.log(canvasString)
        const renderFunction = new Function('ctx', canvasString)


        const width = canvas.getBoundingClientRect().width //this assumes that the size won't change
        const height = canvas.getBoundingClientRect().height
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        renderFunction(ctx)
        this.hooks = {
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
    initApp(){
        const runtime = this
        const appModule = this.run(this.appIRGen)
        console.log(this.appIRGen, appModule)
        Object.assign(this.functionTable, appModule.functionTable)

        this.outputs = appModule.outputs
        Object.keys(this.outputs).forEach((outputKey) => {
            const output = this.outputs[outputKey]
            const ast = output.ast
            const inputs = getInputs(output)
            addInputsToRuntime(runtime, output)
            this.outputs[outputKey] = {
                open: true,
                hash: ast.hash,
                ast,
                value: output.valueFunction,
                hookType: ast.hash === 'apphash' ? 'render' : 'state',
                inputs
            }
        }, this)
    }
    //check if any of "output"'s inputs are available
    inputAvailable(output){
        return output.inputs.some((input) => (this.inputs[input.name].available)) || output.inputs.length === 0
    }
    defArgChange(output){
        return output.inputs.some((input) => (this.inputs[input.name].available && input.isDefinition))
    }

    //for each output if it is available check inputs. if it has input available then run hook
    checkOutputs() {
        const runtime = this
        //pass 'this' to second parameter of forEach to define 'this' in callback
        const recompile = Object.values(this.outputs)
            .map(this.runOutput, this)
            .some((val) => (val))//check if some are true without short-circuiting the values
        //console.log('recompile', recompile)
        //stateAvailable = Object.values(this.stateBuffer).some((input) => (input.avaliable))
        if (recompile){
            //resetMemo()
            //runtime.initApp()
            //runtime.updateDebug(runtime)
        }
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
        }
    }
    runOutput(output) {
        const runtime = this
        if (output.open){
            const inputAvailable = this.inputAvailable(output)

            if (inputAvailable){
                const recompile = this.defArgChange(output)

                const args = output.inputs
                    .map(getInputValue, this)
                output.inputs.forEach((input) => {
                    this.inputs[input.name].lock = true
                }, this)
                const fnArgs = [...args, this.functionTable]
                const value = output.value.apply(null, fnArgs) //inputs go here
                this.hooks[output.hookType](value, output.hash)

                return recompile //split this functinality into a different function?
            }

        } else {
            return false
        }

    }
    parse(lynxString, searchName) { //modify lynx state here (side effect)
        //console.time('parse')
        let hashTable = {}
        if (searchName === undefined){console.log('parsing', lynxString)}
        try {
            const parsed = lynxParser(lynxString)
            hashTable = flattenState(parsed) //returns hash table of objects--eventually this should be part of state
            Object.assign(this.hashTable, hashTable)
            if (searchName === undefined){
                const hash = getHash(parsed)
                return Object.assign(parsed, { hash })
            } else {
                return objectFromName(hashTable, searchName)
            }
        } catch (e) {
            console.warn(e)
            return 'parsing error'//return lynx error object
        }
        //console.timeEnd('parse')
    }
    compile(lynxObject){ //make compile accept a target. ie. canvas, js, GLSL, wasm
        resetLimiter()
        //try {
            //console.time('compile')
            const lynxIR = getValue(this.hashTable, INTERMEDIATE_REP, lynxObject, []) //this uses the global hash table --is this ok because there is still referential transparency? just not a guarantee that it is loaded
            //console.timeEnd('compile')
            if (isUndefined(lynxIR)){
                return {args:{}, varDefs:[], type:"string", value: 'compileError', children:{}, inline:true}
            }
            return lynxIR
        //} //catch (e){ //need to catch this for syntax erroers
            //console.warn(e)
            //return {args:{}, varDefs:[], type:"string", value: 'compileError', children:{}, inline:true}
        //}
    }
    assemble(lynxIR) {
        if (lynxIR.hasOwnProperty('args')){ //success condition-- make this more robust
            //console.time('assemble')
            const lynxModule = assemble(this.hashTable, lynxIR)
            //console.timeEnd('assemble')
            Object.assign(lynxModule.functionTable, this.externalFunctions)
            return lynxModule
        } else { //error condition
            return { functionTable: {}, outputs: {} }
        }
    }
    run(module) { //run a top level module(only inputs as args)
        const outputs = Object.keys(module.outputs)
        const runtime = this
        if (outputs.length === 0){
            return 'module must have at least one output'
        }
        const mainOutput = module.outputs[module.mainOutput]
        const valueFunction = mainOutput.valueFunction
        const inputs = getInputs(mainOutput)
        //console.log(inputs)
        addInputsToRuntime(runtime, mainOutput)
        const args = inputs
            .map(getInputValue, runtime)

        inputs.forEach((input) => {
            this.inputs[input.name].lock = true
        }, this)
        const fnArgs = [...args, module.functionTable]
        //console.log(fnArgs, valueFunction.toString())
        const value = valueFunction(...fnArgs)
        return value
    }
}
