import { compile } from './compiler'
import { INPUT } from './constants'
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

export class Runtime {
    //all lynx state in handled by this runtime object
    constructor(initState, canvas) { //init state is the object table for now
        const runtime = this
        this.outputs = {}
        this.inputs = {}
        this.state = {}
        const lynxState = initState.sim.object
        this.hashTable = lynxState
        const { functionTable, outputs } = compile(lynxState)
        this.functionTable = functionTable

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
                this.state[hash] = value
            }
        }



        Object.keys(outputs).forEach((outputKey) => {
            //console.log(outputs)
            const output = outputs[outputKey]
            const ast = output.ast
            const args = ast.args
            const inputs = Object.values(args)
                .map((arg) => {
                    const inputName = arg.type === INPUT ? arg.name : arg.hash
                    Object.assign(runtime.inputs, {
                        [inputName]: { available: true, value: 0 }
                    })
                    return inputName
                })
                .filter((input) => (typeof input !== 'undefined'))
            this.outputs[outputKey] = {
                evaluation: 'lazy',
                open: true,
                hash: ast.hash,
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
            this.inputs.currentKey = { available: true, value: [e.key] } //make it possible to have multiple keys
            this.checkOutputs()
        })
        document.addEventListener('keyup', () => {
            this.inputs.currentKey = { available: true, value: [] } //make this just pop the key up key out of the set
            this.checkOutputs()
        })

        const renderFunctions = {
            rect: (x,y,width, height,r,g,b) => {
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
                ctx.fillRect(x, y, width, height)
            },
            text: (x, y, innerText, r, g, b) => {
                const size=20
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
                ctx.font = `${size}px serif`
                checkTypes('number', [x,y,r,g,b])
                ctx.fillText(innerText, x, y)
            },
            clear: () => {
                ctx.clearRect(0, 0, width, height);
            }
        }

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
    }
    runOutput(output) {
        if (output.open){
            const inputAvailable = this.inputAvailable(output)
            if (inputAvailable){
                const stateArgs = output.inputs
                    .filter((i) => (i.includes('$hash')))
                    .map((i) => (this.state[i] || 0))
                const args = [this.functionTable, this.inputs].concat(stateArgs)
                const value = output.value.apply(null, args) //inputs go here
                output.hook(value, output.hash)
            }
        }
    }
}
