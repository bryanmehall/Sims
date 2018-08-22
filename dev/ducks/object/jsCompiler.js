import { buildFunction } from './IRutils'

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

const input = (ast) => ('inputs.'+ast.inputName)
const number = (ast) => (JSON.stringify(ast.value))
const boolean = (ast) => (JSON.stringify(ast.value))
const string = (ast) => (JSON.stringify(ast.value))//!!!!!!!!!!!!!!!security risk!!!!!!!!!!!!!

const app = (ast) => {
    const programText = buildChildren(ast, '\n')
    const varDefs = varDefsToString(ast.variableDefs)
    return `return function(prim, inputs) { //app\n${varDefs} ${programText}(prim)\n}`
}

const group = (ast) => {
    const programText = buildChildren(ast, '\n')
    const varDefs = varDefsToString(ast.variableDefs)
    return ` function(prim) { //group\n${varDefs} ${programText}(prim)\n}`
}

const text = (ast) => {
    const programText = buildChildren(ast, ',\n')
    const varDefs = varDefsToString(ast.variableDefs)
    return ` function(prim) { //text\n${varDefs} prim.text(${programText}, 0, 0, 0 );\n}`
}

const get = (ast) => {
    if (ast.inline){
        return ast.hash
    } else {
        const programText = buildChildren(ast, "")
        const varDef = varDefsToString(ast.variableDefs)
        //console.log('programText',programText, 'varDef',varDef)
        return { varDefs: varDef, returnStatement: programText } //is this structure needed or can this just return a string?
    }

}
const search = (ast) => (ast.hash)

const dbSearch = (ast) => (
    //const children = buildChildren(ast)
    //console.log(ast)
     `${ast.hash}()`
)

const apply = (ast) => {
    const children = buildChildren(ast)
    if (children.length === 2){
        return `${children[1]}(${children[0]})`
    } else {
        return `( ${children.join(' ')})`
    }
}
const ternary = (ast) => {
    const [condition, then, alt] = buildChildren(ast)
    return `(${condition}) ? ${then} : ${alt}`
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

const evaluate = () => ('evaluate()')

export const jsCompilers = {
    evaluate,
    input,
    number,
    boolean,
    string,
    app,
    group,
    text,
    ternary,
    get,
    search,
    dbSearch,
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
}
