import { getValue, getJSValue } from './selectors'

const number = (state, objectData, valueData) => {

}

const get = (state, objectData) => {
    const root = getValue(state, 'placeholder', "rootObject", objectData)
    const rootObject = getJSValue(state, 'placeholder', "rootObject", objectData)
    let query
    let getStack
    if (root.type === 'undef'){ //set query to '$this' if root is left undefined
        query = '$this'
        getStack = []
    } else if (rootObject.type === 'undef'){//
        //does this only work for one level deep?
        const attribute = getValue(state, 'placeholder', 'attribute', objectData).id
        const next = getJSValue(state, 'placeholder', attribute, root)
        return next
    } else {
        const searchArgs = Object.entries(rootObject.args)
        if (searchArgs.length>1){ throw 'search args length longer than one' }
        query = searchArgs[0][1].query
        getStack = searchArgs[0][1].getStack//this only works for one search. is more than one ever needed in args?
    }
    const hash = objectData.props.hash
    const args = { [hash]: { query, getStack: [...getStack, objectData] } }
    return {
        hash,
        string: hash,
        args,
        inline: true,
        trace: { type: 'get', args, subTraces: [] }
    }
}

const text = (state, objectData) => {

}

export const primitives = {
    get,
    text
}
