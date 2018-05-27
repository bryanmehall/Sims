import { getValue, getJSValue, foldPrimitive } from './selectors'

const input = (state, objectData) => {
    const hash = objectData.props.hash
    const name = eval(getJSValue(state, 'placeholder', 'name', objectData).string)
    return {
        hash,
        string:'inputs.'+name,
        args:{name},
        inline:true
    }
}
//data primitives
const number = (...args) => (primitive(...args))
const bool =   (...args) => (primitive(...args))
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!security risk if brackets are allowed in string
const string = (...args) => (primitive(...args))
const primitive = (state, objectData, valueData) => ({
    hash: objectData.props.hash,
    string: JSON.stringify(valueData.value),
    args: {},
    inline: true,
    trace: { type: valueData.value, subTraces: [] }
})


//operation primitives
const addition       = (...args) => (binOp(...args))
const subtraction    = (...args) => (binOp(...args))
const multiplication = (...args) => (binOp(...args))
const division       = (...args) => (binOp(...args))
const equal          = (...args) => (binOp(...args))
const lessThan       = (...args) => (binOp(...args))
const greaterThan    = (...args) => (binOp(...args))
const and            = (...args) => (binOp(...args))
const or             = (...args) => (binOp(...args))
const binOp = (state, objectData, valueData) => {
    const symbol = {
        addition: "+",
        subtraction: "-",
        multiplication: "*",
        division: "/",
        equal: "===",
        lessThan: "<",
        greaterThan: ">",
        and: "&&",
        or: "||"
    }

    return {
        hash: objectData.props.hash,
        string: symbol[valueData.type],
        args: {},
        inline: true
    }
}

const get = (state, objectData) => {
    const root = getValue(state, 'placeholder', "rootObject", objectData)
    const rootObject = getJSValue(state, 'placeholder', "rootObject", objectData)
    let query
    let getStack
    if (root.type === 'undef'){ //set query to '$this' if root is left undefined
        query = '$this'
        getStack = []
    } else if (rootObject.type === 'undef'){//
        //does this only work for one level deep?
        const attribute = getValue(state, 'placeholder', 'attribute', objectData).id
        const next = getJSValue(state, 'placeholder', attribute, root)
        return next
    } else {
        const searchArgs = Object.entries(rootObject.args)
        if (searchArgs.length>1){ throw 'search args length longer than one' }
        query = searchArgs[0][1].query
        getStack = searchArgs[0][1].getStack//this only works for one search. is more than one ever needed in args?
    }
    const hash = objectData.props.hash
    const args = { [hash]: { query, getStack: [...getStack, objectData] } }
    return {
        hash,
        string: hash,
        args,
        inline: true,
        trace: { type: 'get', args, subTraces: [] }
    }
}

const search = (state, objectData, valueData) => {
    const query = valueData.query
    const hash = objectData.props.hash
    return {
        hash,
        string: hash,
        args: { search: { query, getStack: [] } }
    }
} //replace this with a call to database?(closer to concept of new)

const recurse = (state, objectData) => {
    eval(getJSValue(state, 'placeholder', 'query', objectData).string)
    const resultHash = getValue(state, 'placeholder', 'result', state.sim.object[name]).props.hash
    return { type: 'recurse', hash: resultHash, string: resultHash, args: {} }
} //eventually combine this with search -- local and global?

const func = (state, objectData) => {
    const paramNames = ["result"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    parameters[0].inline = false //refactor
    const foldedPrimitives = foldPrimitive(state, parameters, objectData)
    const childFunctions = foldedPrimitives.childFunctions
    const variables = foldedPrimitives.variableDefs
    return parameters[0]
    //monad for requiring that function is in table or for placing function in table
}

const apply = (state, objectData) => {
    const paramNames = ['op1','function', 'op2']//add support for binary op
    const functionName = objectData.props.function
    let parameters = paramNames.map((paramName) => (
            getJSValue(state, 'placeholder', paramName, objectData)
        )).filter((param)=>(param !== undefined))
    const foldedPrimitives = foldPrimitive(state, parameters, objectData)
    const childFunctions = foldedPrimitives.childFunctions
    const variables = foldedPrimitives.variableDefs
    const subTraces = foldedPrimitives.trace
    if (parameters.length === 3){//binop
        const programText = childFunctions.join("")
        return {
            hash: objectData.props.hash,
            string: programText,
            args: foldedPrimitives.arguments,
            inline: true,
            trace: { subTraces, type: 'apply', vars: ['1', 'f', '2'] }
        }
    } else { //unop
        const functionHash = parameters[1].hash
        const argString = parameters[0].string
        return {
            hash: objectData.props.hash,
            string: `functionTable.${functionHash}(${argString}, functionTable)`,
            args: {},
            inline: true,
            trace: { subTraces, type: 'apply', vars: ['1', 'f'] }
        }
    }
}

const ternary = (state, objectData) => {
    const paramNames = ["condition", "then", "alt"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const foldedPrimitives = foldPrimitive(state, parameters, objectData)
    if (foldedPrimitives.variableDefs !== ""){ throw new Error('ternary should not have variable definition') }
    const [condition, then, alt] = foldedPrimitives.childFunctions
    const subTraces = foldedPrimitives.trace
    return {
        hash: objectData.props.hash,
        string: `(${condition}) ? ${then} : ${alt}`,
        args: foldedPrimitives.arguments,
        trace: { subTraces, type: 'ternary', vars: ['c', 't', 'e'] },
        inline: false
    }
}

const text = (state, objectData) => {
    const paramNames = ["x", "y", "innerText", "r", "g", "b"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const foldedPrimitives = foldPrimitive(state, parameters, objectData)
    const childFunctions = foldedPrimitives.childFunctions
    const variableDefs = foldedPrimitives.variableDefs
    const subTraces = foldedPrimitives.trace
    const programText = childFunctions.join(",\n\t")
    const string = ` function(prim) { //text\n${variableDefs} prim.text(${programText} );\n}`
    return {
        hash: objectData.props.hash,
        string, //this is the rendering function
        args: Object.assign(foldedPrimitives.arguments, { prim: true }), //combine args of x,y,text
        inline: false,
        trace: { subTraces, type: 'text', vars: ["x", "y", "t", "r", "g", "b"] }
    }
}

const group = (state, objectData) => {
    const children = getJSValue(state, 'placeholder', 'childElements', objectData)
    const parameters = children.filter((child) => (child !== undefined))

    const foldedPrimitives = foldPrimitive(state, parameters, objectData)
    const childFunctions = foldedPrimitives.childFunctions
    const variableDefs = foldedPrimitives.variableDefs
    const subTraces = foldedPrimitives.trace

    //need to sort by z-order
    const programText = childFunctions.map((func) => (func+'(prim)')).join(";\n\t")
    return {
        hash: objectData.props.hash,
        string: ` function(prim) { //group\n${variableDefs} ${programText}\n}`,
        args: foldedPrimitives.arguments,
        trace: { subTraces, type: 'group', vars: ["1","2"] }
    }
}

const app = (state, objectData) => {
    const graphicalRep = getJSValue(state, 'placeholder', 'graphicalRepresentation', objectData)
    const foldedPrimitives = foldPrimitive(state, [graphicalRep], objectData)
    const childFunctions = foldedPrimitives.childFunctions
    const variableDefs = foldedPrimitives.variableDefs
    const subTraces = foldedPrimitives.trace
    const programText = childFunctions[0]
    return {
        string:`return function(prim, inputs) { //app\n${variableDefs} ${programText}(prim)\n}`,
        args: foldedPrimitives.arguments,
        trace:{subTraces, type:'app', vars:['']}
    }
}

const set = (state, objectData) => {
    const set1 = getJSValue(state, 'placeholder', 'subset1', objectData)
    const set2 = getJSValue(state, 'placeholder', 'subset2', objectData)
    return [].concat(set1, set2)
}
//need to create primitives fo array and struct datatypes

export const primitives = {
    input,
    number,
    bool,
    string,
    addition,
    subtraction,
    multiplication,
    division,
    equal,
    lessThan,
    greaterThan,
    and,
    or,
    get,
    search,
    recurse,
    function: func,
    apply,
    ternary,
    text,
    group,
    app,
    set
}
