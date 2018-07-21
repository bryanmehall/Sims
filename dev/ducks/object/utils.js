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

export const isUndefined = (objectData) => (
    objectData.type === 'undef'
)
