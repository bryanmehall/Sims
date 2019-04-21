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

const input = (ast) => (`inputs.${ast.inputName}.value;\n`)
const number = (ast) => (JSON.stringify(ast.value))
const boolean = (ast) => (JSON.stringify(ast.value))
const string = (ast) => (JSON.stringify(ast.value))//todo: !!!!!!!!!!!!!!!XSS risk!!!!!!!!!!!!!

//data structures
const array = (ast) => {
    const programText = buildChildren(ast, ', ')
    return `[${programText}]`
}

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
    const varDefs = varDefsToString(ast.varDefs)
    return `\t//app\n${varDefs}\n\treturn function(prim) { ${programText}(prim) }`
}

const group = (ast) => {
    const elementsList = ast.children.childElements
    if (elementsList !== undefined && elementsList.type === 'array'){ //remove this check when all elements are arrays
        const programText = buildChildren(elementsList, '(prim)\n')
        const varDefs = varDefsToString(ast.varDefs)
        return `\t//group\n${varDefs}\treturn function(prim) { ${programText}(prim) }`
    } else {
        const programText = buildChildren(ast, '(prim)\n')
        const varDefs = varDefsToString(ast.varDefs)
        return `\t//group\n${varDefs}\treturn function(prim) { ${programText}(prim) }`
    }

}

const text = (ast) => {
    const programText = buildChildren(ast, ', ') //space is important for unit tests
    const varDefs = varDefsToString(ast.varDefs)
    return `\t//text\n${varDefs}\treturn function(prim) { prim.text( ${programText}, 0, 0, 0 ) }`//space is important for unit tests
}

const get = (ast) => {
    if (ast.inline){
        return ast.hash
    } else {
        const programText = buildChildren(ast, "")
        const varDef = varDefsToString(ast.varDefs)
        const ret = programText === "" ? ast.hash + "//fix case with no children" : programText // todo: see why the case with no children is failing
        return { varDefs: varDef, returnStatement: ret } //is this structure needed or can this just return a string?
    }
}
const stateNode = (ast) => (ast.hash)
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
    if (ast.varDefs.length === 0){
        return inlineApply(ast)
    } else {
        const varDefs = varDefsToString(ast.varDefs)
        return `\t//apply\n${varDefs}\nreturn ${inlineApply(ast)}`
    }
}

const inlineApply = (ast) => { //helper function for apply
    const children = buildChildren(ast)
    if (children.length === 2){ //unop
        return `${children[1]}(${children[0]})`
    } else if (children.length === 4){ //ternop
        return `${children[0]} ? ${children[2]} : ${children[3]}`
    } else { //binop
        return `( ${children.join(' ')})`
    }
}

const ternary = (ast) => { //remove
    const [condition, then, alt] = buildChildren(ast)
    return `return ${condition} ? \n\t\t${then} : \n\t\t${alt}`
}

const conditional = (ast) => { //this isn't really needed. the string construction is done in the apply assembler
    const [op1, op2, op3] = buildChildren(ast)
    return `return ${op1} ? \n\t\t${op2} : \n\t\t${op3}`
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
    ternary, //replace with conditional
    conditional,
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
