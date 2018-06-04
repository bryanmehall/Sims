import { buildFunction } from './selectors'

const buildChildren = (ast, delimiter) => {
    const childList = Object.values(ast.children)
        .map((childAst) => (buildFunction(childAst)))
    return (delimiter === undefined) ? childList : childList.join(delimiter)
}

const varDefsToString = (varDefs) => (
    varDefs.reverse()
        .map((varDef) => {
            const type = varDef.ast.type
            const string =  jsCompilers[type](varDef.ast)
            return `\tvar ${varDef.key} = ${string}; ${varDef.comment}\n`
        })
        .join('')
)

const input = (ast) => ('inputs.'+ast.inputName)
const number = (ast) => (JSON.stringify(ast.value))
const boolean = (ast) => (JSON.stringify(ast.value))
const string = (ast) => (JSON.stringify(ast.value))

const app = (ast) => {
    const programText = buildChildren(ast, '\n')
    return `return function(prim, inputs) { //app\n${varDefsToString(ast.variableDefs)} ${programText}(prim)\n}`
}

const group = (ast) => {
    const programText = buildChildren(ast, '\n')
    return ` function(prim) { //group\n${varDefsToString(ast.variableDefs)} ${programText}(prim)\n}`
}

const text = (ast) => {
    const programText = buildChildren(ast, ',\n')
    return ` function(prim) { //text\n${varDefsToString(ast.variableDefs)} prim.text(${programText}, 0, 0, 0 );\n}`
}

const get = (ast) => (ast.hash)
const search = (ast) => (ast.hash)

const apply = (ast) => (buildChildren(ast, ''))
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
