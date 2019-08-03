import { getArgsAndVarDefs, argsToVarDefs } from './selectors'
import { getValue, getJSValue, getName, getAttr, getHash } from './objectUtils'
import { addContextToArgs } from './contextUtils'
import { isUndefined } from './utils'
import { GLOBAL_SEARCH, LOCAL_SEARCH, INPUT, INDEX, INTERMEDIATE_REP } from './constants'

const input = (state, objectData) => {
    const hash = getAttr(objectData, 'hash')
    const name = getName(state, objectData)
    return {
        hash,
        type: 'input',
        children: {},
        inputName: name,
        args: { [hash]: { type: INPUT, name, hash } },
        varDefs: [],
        inline: true
    }
}
const stateNode = (state, objectData, valueData) => {
    const hash = valueData.hash//getAttr(objectData, 'hash')//valueData because of the 'state' added to it
    return {
        hash,
        args: {},
        children: {},
        type: 'stateNode',
        varDefs: [],
        inline: true
    }
}

//lynx primitives
const parse = (state, objectData) => (
    {
        hash: getAttr(objectData, 'hash'),
        type: 'parse',
        varDefs: [],
        children: {},
        args: {},
        inline: true
    }
)
const compile = (state, objectData) => (
    {
        hash: getAttr(objectData, 'hash'),
        type: 'compile',
        varDefs: [],
        children: {},
        args: {},
        inline: true
    }
)
const assemble = (state, objectData) => (
    {
        hash: getAttr(objectData, 'hash'),
        type: 'assemble',
        varDefs: [],
        children: {},
        args: {},
        inline: true
    }
)
const run = (state, objectData, valueData) => {
    console.log(objectData, valueData)
    return {
        hash: getAttr(objectData, 'hash'),
        type: 'run',
        varDefs: [],
        children: {},
        args: {},
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
    varDefs: [],
    type: typeof valueData.value,
    inline: true,
})

//data structures
const array = (state, objectData, valueData) => {
    const elements = valueData.value
    const parameters = elements.map((elementData) => {
        const hash = getHash(elementData)
        const elementDataWithHash = { ...elementData, hash }
        const elementPrim = getValue(state, INTERMEDIATE_REP, elementDataWithHash)
        return addContextToArgs(state, 'element', elementPrim, objectData)

    })
    const paramNames = parameters.map(() => ('element'))
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    return {
        hash: getAttr(objectData, 'hash'),
        value: valueData.value,
        args,
        children: Object.assign({}, parameters), //convert to map with index as key
        varDefs,
        type: 'array',
        inline: true
    }
}
// the elements of arrays can depend on the index within the array at run time. Therefore, the index must be passed in as an argument to the array
const arrayElement = (state, objectData) => {
    const paramNames = ['elementValue']

    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    //if the parameter has index as an arg then remove it --need to modify for nested arrays
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    const argEntries = Object.entries(args)
        .filter((entry) => (entry[1].type !== INDEX))
    const filteredArgs = Object.fromEntries(argEntries)
    return {
        hash: getAttr(objectData, 'hash'),
        args: filteredArgs,
        children: { elementValue: parameters[0] },
        type: 'arrayElement',
        varDefs,
        inline: false //make inline if it does not depend on index or array
    }
}
const arrayIndex = (state, objectData) => { //make array index work for nested arrays
    const hash = getAttr(objectData, 'hash')
    return {
        hash,
        type: 'arrayIndex',
        children: {},
        args: { [hash]: { type: INDEX } },
        varDefs: [],
        inline: true
    }
}

const set = (state, objectData) => {

}
const not           = (...args) => (binOp(...args))
const arrayLength   = (...args) => (binOp(...args))
const concat        = (...args) => (binOp(...args))
const map           = (...args) => (binOp(...args))

//operation primitives --refactor
const addition       = (...args) => (binOp(...args))
const subtraction    = (...args) => (binOp(...args))
const multiplication = (...args) => (binOp(...args))
const division       = (...args) => (binOp(...args))
const equal          = (...args) => (binOp(...args))
const lessThan       = (...args) => (binOp(...args))
const greaterThan    = (...args) => (binOp(...args))
const and            = (...args) => (binOp(...args))
const or             = (...args) => (binOp(...args))
const index          = (...args) => (binOp(...args))
const slice          = (...args) => (binOp(...args))
const splice         = (...args) => (binOp(...args))
const substring      = (...args) => (binOp(...args))



const binOp = (state, objectData, valueData) => ({ //rename
    hash: getAttr(objectData, 'hash'),
    type: valueData.type,
    varDefs: [],
    children: {},
    args: {},
    inline: true
})
const conditional = (state, objectData, valueData) => ({
    hash: getAttr(objectData, 'hash'),
    type: valueData.type,
    varDefs: [],
    children: {},
    args: {},
    inline: true
})

const getIndex = (state, objectData) => {
    const paramNames = ['array', 'index']
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    return {
        hash: getAttr(objectData, 'hash'),
        args,
        children: { array: parameters[0], index: parameters[1] },
        type: 'getIndex',
        varDefs,
        inline: true,
        vis: { name: getName(state, objectData) }
    }
}

const contains = (state, objectData) => { //eventually switch to set
    const paramNames = ['array', 'value']
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData)
    return {
        hash: getAttr(objectData, 'hash'),
        args,
        children: { array: parameters[0], index: parameters[1] },
        type: 'contains',
        varDefs,
        inline: true,
        vis: { name: getName(state, objectData) }
    }
}

const get = (state, objectData) => {
    const root = getValue(state, "rootObject", objectData)
    const rootObject = getJSValue(state, 'placeholder', "rootObject", objectData)
    if (rootObject.type !== 'get' && rootObject.type !== 'search'){ //for new root objects --as opposed to searches
        //does this only work for one level deep?
        //change to rootObject.type == new?
        const attributeObject = getValue(state, 'attribute', objectData)
        const attribute = getName(state, attributeObject)
        const next = getJSValue(state, 'placeholder', attribute, root)
        const { args, varDefs } = getArgsAndVarDefs(state, [next], root)
        if (isUndefined(next)){ throw new Error('next is undef') }
        return {
            hash: getAttr(objectData, 'hash'),
            //value: next.hash,
            inline: false,
            args,
            type: 'get',
            children: { value: next }, //is getting this next the cause of duplicate trees?
            varDefs
        }
    } else {
        const searchArgs = Object.values(rootObject.args)
        if (searchArgs.length > 1) { throw new Error('search args length longer than one') }
        const query = searchArgs[0].query
        const getStack = searchArgs[0].getStack //this only works for one search. is more than one ever needed in args?
        const hash = getAttr(objectData, 'hash')
        const args = {
            [hash]: {
                query,
                context: [],
                type: LOCAL_SEARCH,
                getStack: [...getStack, objectData]
            }
        }
        return {
            hash,
            query,
            varDefs: [],
            args,
            inline: true,
            type: 'get',
            children: {},
        }
    }
}

const search = (state, objectData, valueData) => { //search is get root (local Search) not dbSearch --rename to local and global
    const query = valueData.query
    const hash = getAttr(objectData, 'hash')
    return {
        hash,
        type: "search",
        varDefs: [],
        children: {},
        args: { search: { query, type: LOCAL_SEARCH, getStack: [] } }
    }
}

const dbSearch = (state, objectData) => {
    const query = getAttr(getAttr(objectData, 'query'), INTERMEDIATE_REP).value //refactor --get from dbSerachast
    const hash = getAttr(objectData, 'hash')
    //const { ast } = getDBsearchAst(state, objectData, [])
    //console.log(ast)
    //const astArgs = isUndefined(ast) ? {} : ast.args
    //console.log(astArgs)
    return {
        type: GLOBAL_SEARCH,
        query,
        hash,
        varDefs: [],
        inline: true,
        children: {},
        args: {
            [hash]: {
                hash,
                query,
                type: GLOBAL_SEARCH,
                getStack: [],
                context: [],
                searchContext: objectData.inverses
            },
            //...astArgs
        }
    }
}

const apply = (state, objectData) => {
    const paramNames = ['op1','function', 'op2', 'op3', 'op4']
    const parameters = paramNames.map((paramName) => (
            getJSValue(state, 'placeholder', paramName, objectData)
        ))
        .filter((param) => (param !== undefined))

    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    const children =
          parameters.length === 2 ? { op1: parameters[0], function: parameters[1] } //unop
        : parameters.length === 3 ? { op1: parameters[0], function: parameters[1], op2: parameters[2] } //binop
        : parameters.length === 4 ? { op1: parameters[0], function: parameters[1], op2: parameters[2], op3: parameters[3] } //ternop
        : parameters.length === 5 ? { op1: parameters[0], function: parameters[1], op2: parameters[2], op3: parameters[3], op4: parameters[4] } //quadOp --make this an array?
        : {} //error
    if (parameters[1].type === 'run'){
        //mark arguments of run as a definition so the args of result can be added
        //when creating variable definition
        Object.values(args).forEach((arg) => { arg.isDefinition = true })
    }
    return {
        hash: getAttr(objectData, 'hash'),
        args,
        children,
        varDefs,
        inline: true,
        type: "apply",
    }
}
 //remove this?
const ternary = (state, objectData) => {
    const paramNames = ["condition", "then", "alt"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    if (varDefs.length !== 0){ throw new Error('ternary should not have variable definition') }
    return {
        hash: getAttr(objectData, 'hash'),
        type: 'ternary',
        children: { condition: parameters[0],then: parameters[1], alt: parameters[2] },
        args,
        varDefs,
        inline: false
    }
}

const text = (state, objectData) => {
    const paramNames = ["x", "y", "innerText", "r", "g", "b"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    return {
        hash: getAttr(objectData, 'hash'),
        args, //combine args of x,y,text
        children: { x: parameters[0], y: parameters[1], innerText: parameters[2] },
        type: 'text',
        varDefs,
        inline: false,
        vis: { name: getName(state, objectData) }
    }
}
const line = (state, objectData) => {
    const paramNames = ["x1", "y1", "x2", "y2", "r", "g", "b"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    return {
        hash: getAttr(objectData, 'hash'),
        args, //combine args of x,y,text
        children: { x1: parameters[0], y1: parameters[1], x2: parameters[2], y2: parameters[3] },
        type: 'line',
        varDefs,
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
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    //need to sort by z-order
    let children = {}
    if (parameters[0].type === 'array' || parameters[0].type === 'apply'){ //remove check
        children = { childElements: parameters[0] }
    } else {
        children = parameters.length === 1
            ? { childElement1: parameters[0] }
            :{ childElement1: parameters[0], childElement2: parameters[1] }
    }
    return {
        hash: getAttr(objectData, 'hash'),
        type: 'group',
        children,
        args,
        varDefs,
        vis: { name: getName(state, objectData) }
    }
}

const app = (state, objectData) => {
    const paramNames = ["graphicalRepresentation"]
    const parameters = paramNames.map((paramName) => (
        getJSValue(state, 'placeholder', paramName, objectData)
    ))
    const { varDefs, args } = getArgsAndVarDefs(state, parameters, objectData, paramNames)
    return {
        hash: 'apphash',//change this to actual hash...why isn't it there?
        children: { graphicalRep: parameters[0] },
        args,
        inline: false,
        type: 'app',
        varDefs,
    }
}

const evaluate = () => ({
    //this is a lazy node wherewhen it is called, every non-ternary operator below it evaluates
	type: 'evaluate'
})

export const primitives = {
    parse,
    compile,
    assemble,
    run,
    input,
    number,
    bool,
    string,
    array,
    arrayElement,
    arrayIndex,
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
    index,
    arrayLength,
    slice,
    splice,
    substring,
    concat,
    map,
    getIndex,//remove
    contains,
    get,
    search,
    dbSearch,
    state: stateNode, //avoid variable conflict with state
    apply,
    ternary,
    text,
    line,
    group,
    app,
    set,
    evaluate
}
