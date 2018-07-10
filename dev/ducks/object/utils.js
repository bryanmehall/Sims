export const log = (...args) => {
    if (window.debug){
        console.log(...args)
    }
}

export const formatGetLog = (query, getStack) => (
    query+'.'+getStack.map((get) => (get.props.attribute)).join('.')
)

export const isUndefined = (objectData) => (
    objectData.type === 'undef'
)
