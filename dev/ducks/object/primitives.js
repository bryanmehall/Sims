import { getValue, getJSValue, foldPrimitive } from './selectors'

export const varDefsToString = (varDefs) => (
    varDefs.reverse()
        .map((varDef) => (
            `\tvar ${varDef.key} = ${varDef.string}; ${varDef.comment}\n`
        ))
        .join('')
)

const input = (state, objectData) => {
    const hash = objectData.props.hash
    const name = eval(getJSValue(state, 'placeholder', 'name', objectData).string)
    return {
        hash,
        type:'input',
        string: 'inputs.'+name,
        args: { name },
        inline: true
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
    children:{},
    type: typeof valueData.value,
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
        type:valueData.type,
        variableDefs:[],
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
    } else if (rootObject.type === 'undef'){
        //does this only work for one level deep?
        const attribute = getValue(state, 'placeholder', 'attribute', objectData).id
        const next = getJSValue(state, 'placeholder', attribute, root)
        console.log('!!!!!!!!!!!')

        console.log(foldPrimitive(state, [next], root), root, objectData)


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
        type: 'get',
        children: {},
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
    return parameters[0]
    //monad for requiring that function is in table or for placing function in table
}

const apply = (state, objectData) => {
    const paramNames = ['op1','function', 'op2']//add support for binary op
    let parameters = paramNames.map((paramName) => (
            getJSValue(state, 'placeholder', paramName, objectData)
        ))
        .filter((param) => (param !== undefined))
    const { variableDefs, subTraces, childFunctions, args } = foldPrimitive(state, parameters, objectData)

    if (parameters.length === 3){ //binop
        const programText = childFunctions.join("") //op1+op2
        return {
            hash: objectData.props.hash,
            string: programText,
            args,
            variableDefs,
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
    const { variableDefs, subTraces, childFunctions, args } = foldPrimitive(state, parameters, objectData)
    if (variableDefs.length !== 0){ throw new Error('ternary should not have variable definition') }
    const [condition, then, alt] = childFunctions
    return {
        hash: objectData.props.hash,
        type: 'ternary',
        children:{parameters},
        string: `(${condition}) ? ${then} : ${alt}`,
        args,
        variableDefs,
        trace: { subTraces, type: 'ternary', vars: ['c', 't', 'e'] },
        inline: false
    }
}

const text = (state, objectData) => {
    const paramNames = ["x", "y", "innerText", "r", "g", "b"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { variableDefs, subTraces, childFunctions, args } = foldPrimitive(state, parameters, objectData)
    const programText = childFunctions.join(",\n\t")
    const string = ` function(prim) { //text\n${varDefsToString(variableDefs)} prim.text(${programText} );\n}`
    return {
        hash: objectData.props.hash,
        string, //this is the rendering function
        args: Object.assign(args, { prim: true }), //combine args of x,y,text
        children: { x: parameters[0], y: parameters[1], innerText: parameters[2] },
        type: 'text',
        variableDefs,
        inline: false,
        trace: { subTraces, type: 'text', vars: ["x", "y", "t", "r", "g", "b"] }
    }
}

const group = (state, objectData) => {
    const children = getJSValue(state, 'placeholder', 'childElements', objectData)
    const parameters = children.filter((child) => (child !== undefined))

    const { variableDefs, subTraces, childFunctions, args } = foldPrimitive(state, parameters, objectData)
    //need to sort by z-order
    const programText = childFunctions.map((func) => (func+'(prim)')).join(";\n\t")
    return {
        hash: objectData.props.hash,
        type: 'group',
        string: ` function(prim) { //group\n${varDefsToString(variableDefs)} ${programText}\n}`,
        children: { childElement1: parameters[0] },
        args,
        variableDefs,
        trace: { subTraces, type: 'group', vars: ["1","2"] }
    }
}

const app = (state, objectData) => {
    const paramNames = ["graphicalRepresentation"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { childFunctions, variableDefs, args } = foldPrimitive(state, parameters, objectData)
    const programText = childFunctions[0]
    console.log(objectData.props)
    return {
        //string: `return function(prim, inputs) { //app\n${varDefsToString(variableDefs)} ${programText}(prim)\n}`,
        hash: 'apphash',//change this to actual hash...whiy isn't it there?
        children: { graphicalRep: parameters[0] },
        args,
        type: 'app',
        variableDefs,
        //trace: { subTraces, type: 'app', vars: [''] }
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
