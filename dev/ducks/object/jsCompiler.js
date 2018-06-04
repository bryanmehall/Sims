import { varDefsToString } from './primitives'
import { buildFunction } from './selectors'

const buildChildren = (ast, delimiter) => (
    Object.values(ast.children)
        .map((childAst) => (buildFunction(childAst)))
        .join(delimiter)
)

const app = (ast) => {
    const programText = buildChildren(ast, '\n')
    return `return function(prim, inputs) { //app\n${varDefsToString(ast.variableDefs)} ${programText}(prim)\n}`
}

const group = (ast) => {
    const programText = buildChildren(ast, '\n')
    return ` function(prim) { //group\n${varDefsToString(ast.variableDefs)} ${programText}(prim)\n}`
}

export const jsCompilers = {
    app,
    group
}
