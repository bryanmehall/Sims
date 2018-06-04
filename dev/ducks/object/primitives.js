import { getValue, getJSValue, foldPrimitive, getName } from './selectors'

const input = (state, objectData) => {
    const hash = objectData.props.hash
    const name = getName(state, objectData)
    return {
        hash,
        type: 'input',
        inputName: name,
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
    value: valueData.value,
    args: {},
    children: {},
    variableDefs: [],
    type: typeof valueData.value,
    inline: true,
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
const binOp = (state, objectData, valueData) => ({
        hash: objectData.props.hash,
        type: valueData.type,
        variableDefs: [],
        args: {},
        inline: true
})

const get = (state, objectData) => {
    const root = getValue(state, 'placeholder', "rootObject", objectData)
    const rootObject = getJSValue(state, 'placeholder', "rootObject", objectData)
    let query
    let getStack
    if (root.type === 'undef'){ //for implied root (only works for one level deep)
        //set query to '$this' if root is left undefined
        query = '$this'
        getStack = []
    } else if (rootObject.type === 'undef'){ //for new root objects --as opposed to searches
        //does this only work for one level deep?
        //change to rootObject.type == new?
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
        variableDefs: [],
        args,
        inline: true,
        type: 'get',
        children: {},
    }
}

const search = (state, objectData, valueData) => {
    const query = valueData.query
    const hash = objectData.props.hash
    return {
        hash,
        variableDefs: [],
        children: {},
        args: { search: { query, getStack: [] } }
    }
} //replace this with a call to database?(closer to concept of new)

const func = (state, objectData) => {
    const paramNames = ["result"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    parameters[0].inline = false //refactor
    //const foldedPrimitives = foldPrimitive(state, parameters, objectData)
    return parameters[0]
    //monad for requiring that function is in table or for placing function in table
}

const apply = (state, objectData) => {
    const paramNames = ['op1','function', 'op2']//add support for binary op
    let parameters = paramNames.map((paramName) => (
            getJSValue(state, 'placeholder', paramName, objectData)
        ))
    const { variableDefs, args } = foldPrimitive(state, parameters, objectData)
    return {
        hash: objectData.props.hash,
        args,
        children: { op1: parameters[0], function: parameters[1], op2: parameters[2] },
        variableDefs,
        inline: true,
        type: "apply",
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
        children: { condition: parameters[0],then: parameters[1], alt: parameters[2] },
        args,
        variableDefs,
        inline: false
    }
}

const text = (state, objectData) => {
    const paramNames = ["x", "y", "innerText", "r", "g", "b"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { variableDefs, args } = foldPrimitive(state, parameters, objectData)
    return {
        hash: objectData.props.hash,
        args: Object.assign(args, { prim: true }), //combine args of x,y,text
        children: { x: parameters[0], y: parameters[1], innerText: parameters[2] },
        type: 'text',
        variableDefs,
        inline: false,
    }
}

const group = (state, objectData) => {
    const children = getJSValue(state, 'placeholder', 'childElements', objectData)
    const parameters = children.filter((child) => (child !== undefined))

    const { variableDefs, args } = foldPrimitive(state, parameters, objectData)
    //need to sort by z-order
    return {
        hash: objectData.props.hash,
        type: 'group',
        children: { childElement1: parameters[0] },
        args,
        variableDefs,
    }
}

const app = (state, objectData) => {
    const paramNames = ["graphicalRepresentation"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { variableDefs, args } = foldPrimitive(state, parameters, objectData)
    return {
        hash: 'apphash',//change this to actual hash...whiy isn't it there?
        children: { graphicalRep: parameters[0] },
        args,
        type: 'app',
        variableDefs,
    }
}
const evaluate = () => (
    {
        type: 'evaluate'
    }
)

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
    function: func,
    apply,
    ternary,
    text,
    group,
    app,
    set,
    evaluate
}
