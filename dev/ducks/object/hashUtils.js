import { deleteKeys } from './utils'
import murmurhash from 'murmurhash' //switch to sipHash for data integrity?
import { getNameFromAttr } from './objectUtils'

export const objectFromHash = (state, hash) => {
    const value = state[hash]
    if (typeof value === 'undefined'){
        throw new Error(`could not find object named ${JSON.stringify(hash)} in state`)
    } else {
        return value
    }
}

export const isHash = (str) => (
    typeof str === 'string' && str.includes("$hash")
)

//helper for converting each attribute to hash
const objectValuesToHash = (hashData, entry) => {
    const prop = entry[0]
    const subTree = entry[1]
    if (typeof subTree === 'string'){ //move this check to get Hash eventually
        return Object.assign({}, hashData, { [prop]: subTree })
    } else {
        return Object.assign({}, hashData, { [prop]: getHash(subTree) })
    }
}

export const getHash = (objectData) => { //this should check that all children are hashes before hashing ie not hashing the whole tree
    //remove these attrs before hashing
    if (typeof objectData === "string"){
        return "$hash_string_"+ murmurhash.v3(objectData)
    }
    const exemptProps = ["hash", "parentValue"]
    const expandedHashData = deleteKeys(objectData, exemptProps)
    //convert remaining values to hashes
    const hashData = Object.entries(expandedHashData).reduce(objectValuesToHash, {})
    const name = getNameFromAttr(objectData)
    const digest = "$hash_"+name+'_'+ murmurhash.v3(JSON.stringify(hashData))
	return digest
}