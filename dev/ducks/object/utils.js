export const log = (...args) => {
    if (window.debug){
        console.log(...args)
    }
}

export const formatGetLog = (query, getStack) => (
    query+'.'+getStack.map((get) => (get.props.attribute)).join('.')
)

export const formatDBSearchLog = (dbSearches) => {
    return dbSearches.map((dbSearch) => {
        const hash = dbSearch.ast.hash
        if (Object.keys(dbSearch.ast.args).length === 0 ){
            return ''
        }
        const dbArg = dbSearch.ast.args[hash]
        return formatGetLog(dbArg.query, dbArg.getStack)
    }).join(', ')
}

export const getFunctionDiff = (function1, function2) => {
    const str1 = function1.toString()
    const str2 = function2.toString()
    if (str1 !== str2){
        console.log(str1, str2)
    }
}
export const logFunctionTableDiff = (ft1, ft2) => {
    Object.entries(ft1).forEach((entry) => {
        const f2 = ft2[entry[0]]
        const f1 = entry[1]
        getFunctionDiff(f1, f2)
    })
}
export const logFunctionTable = (functionTable) => {
    Object.entries(functionTable).forEach((entry)=>{
        const key = entry[0]
        const func = entry[1].toString()
        console.log(key, func)
    })
}

export const isUndefined = (objectData) => (
    objectData.type === 'undef'
)
