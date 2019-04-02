import { buildFunction, getStateArgs } from './IRutils'

const buildChildren = (ast, delimiter) => {
    const childList = Object.values(ast.children)
        .map((childAst) => (buildFunction(childAst).string))
    return (delimiter === undefined) ? childList : childList.join(delimiter)
}

const varDefsToString = (varDefs) => (
    varDefs.reverse()
        .map((varDef) => {
            let string =  buildFunction(varDef.ast).string
            if (string.hasOwnProperty('returnStatement')){
                string = string.returnStatement
            }
            return `\tvar ${varDef.key} = ${string}; ${varDef.comment}\n`
        })
        .join('')
)

const input = (ast) => (`inputs.${ast.inputName}.value`)
const number = (ast) => (JSON.stringify(ast.value))
const boolean = (ast) => (JSON.stringify(ast.value))
const array = (ast) => JSON.stringify(ast.value)
const string = (ast) => (JSON.stringify(ast.value))//todo: !!!!!!!!!!!!!!!XSS risk!!!!!!!!!!!!!

const getIndex = (ast) => {
    const programText = buildChildren(ast)
    return `${programText[0]}[${programText[1]}]`
}

const contains = (ast) => {
    const programText = buildChildren(ast)
    return `!(${programText[0]}.indexOf(${programText[1]}) === -1)`
}

const app = (ast) => {
    const programText = buildChildren(ast, '\n')
    const varDefs = varDefsToString(ast.variableDefs)
    const stateDefs = getStateArgs(ast)
        .map((arg) => (`\tvar ${arg.hash} = inputs.${arg.hash}.value`))
        .join('\n')
    return `\t//app\n${varDefs}${stateDefs}\treturn function(prim) { ${programText}(prim) }`
}

const group = (ast) => {
    const child1 = ast.children.childElement1
    if (child1.type === array){
        console.log('################array')
    } else {
        const programText = buildChildren(ast, '(prim)\n')
        const varDefs = varDefsToString(ast.variableDefs)
        return `\t//group\n${varDefs}\treturn function(prim) { ${programText}(prim) }`
    }

}

const text = (ast) => {
    const programText = buildChildren(ast, ', ') //space is important for unit tests
    const varDefs = varDefsToString(ast.variableDefs)
    return `\t//text\n${varDefs}\treturn function(prim) { prim.text( ${programText}, 0, 0, 0 ) }`//space is important for unit tests
}

const get = (ast) => {
    if (ast.inline){
        return ast.hash
    } else {
        const programText = buildChildren(ast, "")
        const varDef = varDefsToString(ast.variableDefs)

        /*
        if (ast.isFunction){
            return { varDefs: varDef, returnStatement: ast.hash }
        }*/
        //console.log("here", ast, varDef, programText)
        const ret = programText === "" ? ast.hash + "//fix case with no children" : programText // todo: see why the case with no children is failing
        return { varDefs: varDef, returnStatement: ret } //is this structure needed or can this just return a string?
    }

}
const stateNode = (ast) => {
    console.log('state node', ast)
    return ast.hash
}
const search = (ast) => (ast.hash)

const globalSearch = (ast) => {
    if (ast.inline){
        const args = Object.keys(ast.args)
        return `${ast.hash}( ${args.join(',')}, functionTable)`
    } else {
        return `return ${ast.hash}(prim, functionTable) //${ast.query}`
    }
}

const apply = (ast) => {
    const children = buildChildren(ast)
    if (children.length === 2){
        return `${children[1]}(${children[0]})`
    } else {
        return `( ${children.join(' ')})`
    }
}
//todo: combine the
const ternary = (ast) => {
    const [condition, then, alt] = buildChildren(ast)
    return `return ${condition} ? \n\t\t${then} : \n\t\t${alt}`
}
const addition       = () => ('+')
const subtraction    = () => ('-')
const multiplication = () => ('*')
const division       = () => ('/')
const equal          = () => ('===')
const lessThan       = () => ('<')
const greaterThan    = () => ('>')
const and            = () => ('&&')
const or             = () => ('||')
const not            = () => ('!')

const evaluate = () => ('evaluate()')

export const jsCompilers = {
    evaluate,
    input,
    number,
    boolean,
    array,
    string,
    getIndex,
    contains,
    app,
    group,
    text,
    ternary,
    get,
    search,
    globalSearch,
    stateNode,
    apply,
    addition,
    subtraction,
    multiplication,
    division,
    equal,
    lessThan,
    greaterThan,
    and,
    or,
    not
}
