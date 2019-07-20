import { UNDEFINED } from './constants'
const constructString = (string) => ({
    lynxIR: { type: "string", value: string, args: {} }
})
export const objectLib = {
	id: (id) => ({
			lynxIR: { type: 'id', id }
	}),
	undef: {
        name: constructString(UNDEFINED)
	},
	union: (set1, set2, scope) => ({
		props: {
			set1: set1,
			set2: set2,
			id: 'union',
			function: 'unionFunction',
			scope,
			lynxIR: { type: 'apply' }
		}
	}),
	find: (attrList) => { //switch this to get?
		if (attrList.length === 1){
			return {
				props: {
					lynxIR: { type: "find" },
					attribute: attrList[0]
				}
			}
		} else {
			const currentAttr = attrList.shift()
			return {
				type: "find",
				props: {
					lynxIR: { type: "find" },
					attribute: currentAttr,
					then: objectLib.find(attrList)
				}
			}
		}
	},
	constructSearch: (query) => ({ //add support for searching different databases
			query,
			id: 'search'+query,
			lynxIR: { type: 'search', id: query }
	}),
    constructString,
    constructArray: function(name, elements){
        return {
                name: constructString("array"),
                instanceOf: "array",
                lynxIR: { type: "array", value: elements }
            }
    },
	constructSet: function(id, elements){
		const length = elements.length
		if (length === 1){
			return elements[0]
		} else {

			const set1 = this.constructSet('sub1'+id, elements.slice(0, length/2))
			const set2 = this.constructSet('sub2'+id, elements.slice(length/2))
			return {
				type: 'set',
				props: {
					lynxIR: { type: 'set' },
                    type: objectLib.constructString('set'),
					subset1: set1,
					subset2: set2,
                    name: objectLib.constructString('set'),
					id: id
				}
			}
		}
	}
}
