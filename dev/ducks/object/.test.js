import { createMockStore } from '../../utils/testing'
import {default as actions} from './actions'
import { getProp } from './selectors'

/*
describe('addObject',() =>{

	it('should add object named testObject to store', ()=>{
		expect()
	})
})
*/

describe('get/set prop', () => {
	const store = createMockStore()
	store.dispatch(actions.addObject('testObject', "testType"))
	store.dispatch(actions.setProp('testObject', 'testProp', 1))
	const state = store.getState()
	it('should set and retrieve property value from the store', () => {
		expect(getProp(state, 'testObject', 'testProp')).toBe(1)
	})
})
