import { getArgsAndVarDefs, argsToVarDefs } from './selectors'
import { getValue, getJSValue, getName, getAttr, getHash, addContext } from './objectUtils'
import { isUndefined } from './utils'
import { THIS, GLOBAL_SEARCH, LOCAL_SEARCH } from './constants'

const input = (state, objectData) => {
    const hash = getAttr(objectData, 'hash')
    const name = getName(state, objectData)
    return {
        hash,
        type: 'input',
        children: {},
        inputName: name,
        args: { [hash]: { type: 'input', name } },
        variableDefs: [],
        inline: true
    }
}
const stateNode = (state, objectData) => {
    const hash = getAttr(objectData, 'hash')
    return {
        hash,
        args: {}, //combine args of x,y,text
        children: {},
        type: 'stateNode',
        variableDefs: [],
        inline: true
    }
}

//data constants
const number = (...args) => (primitive(...args))
const bool =   (...args) => (primitive(...args))
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!security risk if brackets are allowed in string
const string = (...args) => (primitive(...args))
const primitive = (state, objectData, valueData) => ({
    hash: getAttr(objectData, 'hash'),
    value: valueData.value,
    args: {},
    children: {},
    variableDefs: [],
    type: typeof valueData.value,
    inline: true,
})

//data structures
const array = (state, objectData, valueData) => {
    const elements = valueData.value
    const parameters = elements.map((elementData) => {
        const elementHash = getHash(elementData)
        const elementValueData = getValue(state, 'elementValue', Object.assign({}, elementData, { hash: elementHash })).value
        const elementValueHash = getHash(elementValueData)
        const elementValueDataWithHash = Object.assign({}, elementValueData, { hash: elementValueHash })
        const valuePrimitive = getValue(state, 'jsPrimitive', elementValueDataWithHash).value //todo: this will not work with context --need to pass prop?
        const withContext = addContext(state, 'elementValue', valuePrimitive, elementValueDataWithHash)
        const { args, varDefs } = argsToVarDefs(state, elementData, { args: withContext.args, varDefs: withContext.variableDefs })
        return Object.assign({}, withContext, { args, variableDefs: varDefs })
    })
    const paramNames = parameters.map(() => ('element'))

    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    return {
        hash: getAttr(objectData, 'hash'),
        value: valueData.value,
        args,
        children: Object.assign({}, parameters), //convert to map with index as key
        variableDefs,
        type: 'array',
        inline: true
    }
}

const set = (state, objectData) => {

}
const not           = (...args) => (binOp(...args))

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
    hash: getAttr(objectData, 'hash'),
    type: valueData.type,
    variableDefs: [],
    children: {},
    args: {},
    inline: true
})
const conditional = (state, objectData, valueData) => ({
    hash: getAttr(objectData, 'hash'),
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
        hash: getAttr(objectData, 'hash'),
        args: args, //combine args of x,y,text
        children: { array: parameters[0], index: parameters[1] },
        type: 'getIndex',
        variableDefs,
        inline: true,
        vis: { name: getName(state, objectData) }
    }
}

const contains = (state, objectData) => { //eventually switch to set
    const paramNames = ['array', 'value']
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    return {
        hash: getAttr(objectData, 'hash'),
        args: args, //combine args of x,y,text
        children: { array: parameters[0], index: parameters[1] },
        type: 'contains',
        variableDefs,
        inline: true,
        vis: { name: getName(state, objectData) }
    }
}

const get = (state, objectData) => {
    const { value: root } = getValue(state, "rootObject", objectData)
    const rootObject = getJSValue(state, 'placeholder', "rootObject", objectData)
    let query = THIS
    let getStack = []
    if (isUndefined(root)){ //for implied root (only works for one level deep)
        //set query to THIS if root is left undefined
        query = THIS
        getStack = []
    } else if (rootObject.type !== 'get' && rootObject.type !== 'search'){ //for new root objects --as opposed to searches
        //does this only work for one level deep?
        //change to rootObject.type == new?
        const attributeObject = getValue(state, 'attribute', objectData).value
        const attribute = getName(state, attributeObject)
        const next = getJSValue(state, 'placeholder', attribute, root)
        const { args, variableDefs } = getArgsAndVarDefs(state, [next], root)
        if (isUndefined(next)){ throw new Error('next is undef') }
        return {
            hash: getAttr(objectData, 'hash'),
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
    const hash = getAttr(objectData, 'hash')
    const args = {
        [hash]: {
            query,
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

const search = (state, objectData, valueData) => { //search is get root (local Search) not dbSearch --rename to local and global
    const query = valueData.query
    const hash = getAttr(objectData, 'hash')
    return {
        hash,
        type: "search",
        variableDefs: [],
        children: {},
        args: { search: { query, type: 'localGet', getStack: [] } }
    }
}

const dbSearch = (state, objectData) => {
    const query = getAttr(getAttr(objectData, 'query'), 'jsPrimitive').value //refactor --get from dbSerachast
    const hash = getAttr(objectData, 'hash')
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

const apply = (state, objectData) => {
    const paramNames = ['op1','function', 'op2', 'op3']
    const parameters = paramNames.map((paramName) => (
            getJSValue(state, 'placeholder', paramName, objectData)
        ))
        .filter((param) => (param !== undefined))
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    const children =
          parameters.length === 2 ? { op1: parameters[0], function: parameters[1] } //unop
        : parameters.length === 3 ? { op1: parameters[0], function: parameters[1], op2: parameters[2] } //binop
        : parameters.length === 4 ? { op1: parameters[0], function: parameters[1], op2: parameters[2], op3: parameters[3] } //ternop
        : {} //error
    return {
        hash: getAttr(objectData, 'hash'),
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
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    if (variableDefs.length !== 0){ throw new Error('ternary should not have variable definition') }
    return {
        hash: getAttr(objectData, 'hash'),
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
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    return {
        hash: getAttr(objectData, 'hash'),
        args, //combine args of x,y,text
        children: { x: parameters[0], y: parameters[1], innerText: parameters[2] },
        type: 'text',
        variableDefs,
        inline: false,
        vis: { name: getName(state, objectData) }
    }
}

const group = (state, objectData) => {
    const paramNames = ["childElement1", "childElement2", "childElements"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
        ))
        .filter((child) => (child !== undefined))
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    //need to sort by z-order
    let children = {}
    if (parameters[0].type === 'array'){
        children = { childElements: parameters[0] }
    } else {
        children =
            parameters.length === 1 ? { childElement1: parameters[0] }
            :{ childElement1: parameters[0], childElement2: parameters[1] }
    }
    return {
        hash: getAttr(objectData, 'hash'),
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
    const { variableDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    return {
        hash: 'apphash',//change this to actual hash...why isn't it there?
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
    not,
    conditional,
    getIndex,
    contains,
    get,
    search,
    dbSearch,
    state: stateNode, //avoid variable conflict with state
    apply,
    ternary,
    text,
    group,
    app,
    set,
    evaluate
}
