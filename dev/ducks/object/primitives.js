import { getArgsAndVarDefs } from './selectors'
import { getValue, getJSValue, getName } from './objectUtils'
import { isUndefined } from './utils'
import { THIS, GLOBAL_SEARCH, LOCAL_SEARCH } from './constants'

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
//data constants
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

//data structures
const array = (state, objectData, valueData) => {
    return {
        hash: objectData.props.hash,
        value: valueData.value,
        args: {},
        children: {},
        variableDefs: [],
        type: 'array',
        inline: true
    }
}

const set = (state, objectData) => {

}

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

const getIndex = (state, objectData) => {
    const paramNames = ['array', 'index']
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    return {
        hash: objectData.props.hash,
        args: args, //combine args of x,y,text
        children: { array: parameters[0], index: parameters[1] },
        type: 'getIndex',
        variableDefs,
        inline: true,
        vis: { name: getName(state, objectData) }
    }
}

const get = (state, objectData) => {
    const { value: root } = getValue(state, 'placeholder', "rootObject", objectData)
    const rootObject = getJSValue(state, 'placeholder', "rootObject", objectData)
    let query
    let getStack
    if (root.type === 'undef'){ //for implied root (only works for one level deep)
        //set query to THIS if root is left undefined
        query = THIS
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
            children: { value: next }, //is getting this next the cause of duplicate trees?
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
            type: LOCAL_SEARCH,
            getStack: [...getStack, objectData]
        }
    }
    return {
        hash,
        query,
        variableDefs: [],
        args,
        inline: true,
        type: 'get',
        children: {},
    }
}

const recursive = () => {
    throw 'here'
}
const search = (state, objectData, valueData) => { //search is get root (local Search) not dbSearch --rename to local and global
    const query = valueData.query
    const hash = objectData.props.hash
    return {
        hash,
        type: "search",
        variableDefs: [],
        children: {},
        args: { search: { query, type: 'localGet', getStack: [] } }
    }
}

const dbSearch = (state, objectData) => {
    const query = objectData.props.query.props.jsPrimitive.value //refactor --get from dbSerachast
    const hash = objectData.props.hash
    //const { ast } = getDBsearchAst(state, objectData, [])
    //console.log(ast)
    //const astArgs = isUndefined(ast) ? {} : ast.args
    //console.log(astArgs)
    return {
        type: GLOBAL_SEARCH,
        query,
        hash,
        variableDefs: [],
        inline: true,
        children: {},
        args: {
            [hash]: {
                hash,
                query,
                type: GLOBAL_SEARCH,
                getStack: [],
                searchContext: objectData.inverses
            },
            //...astArgs
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
    const children = parameters[2] === undefined
        ? { op1: parameters[0], function: parameters[1] }
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
        inline: false,
        vis: { name: getName(state, objectData) }
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
        vis: { name: getName(state, objectData) }
    }
}

const group = (state, objectData) => {
    const paramNames = ["childElement1", "childElement2"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
        ))
        .filter((child) => (child !== undefined))
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    //need to sort by z-order
    const children = parameters.length ===1
        ? { childElement1: parameters[0] }
        :{ childElement1: parameters[0], childElement2: parameters[1] }
    return {
        hash: objectData.props.hash,
        type: 'group',
        children,
        args,
        variableDefs,
        vis: { name: getName(state, objectData) }
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

/*const set = (state, objectData) => {
    const set1 = getJSValue(state, 'placeholder', 'subset1', objectData)
    const set2 = getJSValue(state, 'placeholder', 'subset2', objectData)
    return [].concat(set1, set2)
}*/
//need to create primitives fo array and struct datatypes

export const primitives = {
    input,
    number,
    bool,
    string,
    array,
    addition,
    subtraction,
    multiplication,
    division,
    equal,
    lessThan,
    greaterThan,
    and,
    or,
    getIndex,
    get,
    search,
    dbSearch,
    recursive,
    //function: func,
    apply,
    ternary,
    text,
    group,
    app,
    set,
    evaluate
}
