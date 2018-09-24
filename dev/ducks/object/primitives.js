import { getArgsAndVarDefs } from './selectors'
import { getValue, getJSValue, getName } from './objectUtils'
import { isUndefined } from './utils'

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
		children: {},
        args: {},
        inline: true
})

const get = (state, objectData) => {
    const { value: root } = getValue(state, 'placeholder', "rootObject", objectData)
    const rootObject = getJSValue(state, 'placeholder', "rootObject", objectData)
    //console.log('inverses', objectData.inverses)
    let query
    let getStack
    if (root.type === 'undef'){ //for implied root (only works for one level deep)
        //set query to '$this' if root is left undefined
        query = '$this'
        getStack = []
    } else if (rootObject.type !== 'get' && rootObject.type !== 'search'){ //for new root objects --as opposed to searches
        //does this only work for one level deep?
        //change to rootObject.type == new?
        const attribute = getValue(state, 'placeholder', 'attribute', objectData).value.id
        const next = getJSValue(state, 'placeholder', attribute, root)
        const { args, variableDefs } = getArgsAndVarDefs(state, [next], root)
        if (isUndefined(next)){ throw new Error('next is undef') }
        return {
            hash: objectData.props.hash,
            //value: next.hash,
            inline: false,
            args,
            type: 'get',
            children: { value: next },
            variableDefs: variableDefs
        }
    } else {
        const searchArgs = Object.entries(rootObject.args)
        if (searchArgs.length>1){ throw 'search args length longer than one' }
        query = searchArgs[0][1].query
        getStack = searchArgs[0][1].getStack //this only works for one search. is more than one ever needed in args?
    }
    const hash = objectData.props.hash
    //console.log('adding context to ',objectData, objectData.inverses)
    const args = {
        [hash]: {
            query,
            context: objectData.inverses,
            type: 'localSearch',
            getStack: [...getStack, objectData]
        }
    }
    return {
        hash,
        variableDefs: [],
        args,
        inline: true,
        type: 'get',
        children: {},
    }
}

const search = (state, objectData, valueData) => { //search is get root (localSearch) not dbSearch --rename to local and global
    const query = valueData.query
    const hash = objectData.props.hash
    return {
        hash,
        type: "search",
        variableDefs: [],
        children: {},
        args: { search: { query, type: 'localGet', getStack: [] } }
    }
} //replace this with a call to database?(closer to concept of new)

const dbSearch = (state, objectData) => {
    const query = objectData.props.query.props.jsPrimitive.value //refactor
    const hash = objectData.props.hash
    return {
        type: 'dbSearch',
        query,
        hash,
        variableDefs: [],
        inline: true,
        children: {},
        args: {
            [hash]: {
                hash,
                query,
                type: 'globalGet',
                getStack: [],
                searchContext: objectData.inverses
            }
        }
    }
}

/*const func = (state, objectData) => {
	throw 'function primitive'
    const paramNames = ["result"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    parameters[0].inline = false //refactor
    //const foldedPrimitives = getArgsAndVarDefs(state, parameters, objectData)
    return parameters[0]
    //monad for requiring that function is in table or for placing function in table
}*/

const apply = (state, objectData) => {
    const paramNames = ['op1','function', 'op2']//add support for binary op
    const parameters = paramNames.map((paramName) => (
            getJSValue(state, 'placeholder', paramName, objectData)
        ))
        .filter((param) => (param !== undefined))
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    const children = parameters[2] === undefined ?
        { op1: parameters[0], function: parameters[1] }
         : { op1: parameters[0], function: parameters[1], op2: parameters[2] }
    return {
        hash: objectData.props.hash,
        args,
        children,
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
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    if (variableDefs.length !== 0){ throw new Error('ternary should not have variable definition') }
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
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
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
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
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
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    return {
        hash: 'apphash',//change this to actual hash...whiy isn't it there?
        children: { graphicalRep: parameters[0] },
        args,
        inline: true,
        type: 'app',
        variableDefs,
    }
}

const evaluate = () => ({
    //this is a lazy node wherewhen it is called, every non-ternary operator below it evaluates
	type: 'evaluate'
})

const set = (state, objectData) => {
    const set1 = getJSValue(state, 'placeholder', 'subset1', objectData)
    return [set1]
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
    dbSearch,
    //function: func,
    apply,
    ternary,
    text,
    group,
    app,
    set,
    evaluate
}
