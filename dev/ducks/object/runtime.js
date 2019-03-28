import { compile } from './selectors'
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
        const width = canvas.getBoundingClientRect().width //this assumes that the size won't change
        const height = canvas.getBoundingClientRect().height
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        const lynxState = initState.sim.object
        const { renderMonad, functionTable, stateArgs } = compile(lynxState)
        const stateInputs = stateArgs.reduce((inputs, arg) => (
            Object.assign(inputs, { [arg.hash]: { value: undefined, available: true } })
        ), {})
        const stateOutputs = stateArgs.reduce((outputs, arg) => (
            Object.assign(outputs, {
                [arg.hash]: {
                    evaluation: 'lazy',
                    open: true,
                    value: () => (renderMonad(functionTable)), //take inputs as arg
                    hook: (renderer) => {
                        renderFunctions.clear()
                        renderer(renderFunctions, runtime.inputs)
                    },
                    inputs: ['mouseX', 'mouseY', 'mouseDown', "$hash__3284533923"]
                }
            })
        ), {})
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


        this.inputs = {
            mouseX: {
                available: true,
                value: 25
            },
            mouseY: {
                available: true,
                value: 50
            },
            mouseDown: {
                available: false,
                value: false
            },
            time: {
                avalilable: true,
                value: () => (performance.now())
            },
            ...stateInputs
        }
        this.outputs = {
            //add other outputs from compile here
            render: {
                evaluation: 'lazy',
                open: true,
                value: () => (renderMonad(functionTable, runtime.inputs)), //take inputs as arg
                hook: (renderer) => {
                    renderFunctions.clear()
                    renderer(renderFunctions)
                },
                inputs: ['mouseX', 'mouseY', 'mouseDown', "$hash__3284533923"]
            }
        }
        this.checkOutputs()
    }
    inputAvailable(output){
        return output.inputs.some((name) => (this.inputs[name].available))
    }
    checkOutputs() {
        Object.values(this.outputs).forEach(this.runOutput, this) //pass 'this' to second parameter of forEach to define 'this' in callback
        //for each output if it is available check inputs. if it has input available then run hook
    }
    runOutput(output) {
        if (output.open){
            const inputAvailable = this.inputAvailable(output)
            if (inputAvailable){
                const value = output.value() //inputs go here
                output.hook(value)
            }
        }
    }
}
