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
            let string =  buildFunction(varDef.ast)//jsCompilers[type](varDef.ast)
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

const dbSearch = (ast) => {
    const children = buildChildren(ast)
    console.log(ast)
    return `${ast.hash}()`
}

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
