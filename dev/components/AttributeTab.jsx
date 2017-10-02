import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getDef, getValue } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'

const AttributeTab = ({ objectId, attrId, definition, value, setProp, setActiveObject }) => {
	let definitionDisp = ''
	let valueDisp = ''
	//console.log('value', value, 'definition', definition)
	if (definition === undefined || value === undefined) {
		throw new Error(`definition is undefined for ${objectId}.${attrId}`)
	} else if (Array.isArray(definition)) { //object reference
		const rootObject = definition[0]//keep in mind that this a nested "get" function
		const attributes = definition.slice(1)

		const linkStyle = {
			cursor: 'pointer',
			border: '1px solid #888',
			borderRadius: 4,
			padding: 2,
			backgroundColor: '#ccc'
		}
		definitionDisp = (
			<span>
				<span
					onClick={() => { setActiveObject(rootObject) }}
					style={linkStyle}
					>{rootObject}
				</span>
				.{attributes.join('.')}
			</span>
		)
		valueDisp = (
			<span
				onClick={() => { setActiveObject(value) }}
				style={linkStyle}
				>{value}
			</span>
		)
	} else if (definition.hasOwnProperty('function')) {
		definitionDisp = 'function primitive'
		valueDisp = JSON.stringify(value)
	} else if (typeof value === 'number'){ //number primitive
		const numberChange = (e) => {
			setProp(objectId, attrId, parseFloat(e.target.value)|| 0)
			const charCode = (typeof e.which == "number") ? e.which : e.keyCode
			if (charCode === 13){ //backslash is keycode 92
				setProp(objectId, attrId, parseFloat(e.target.value))
			}
		}
		valueDisp = JSON.stringify(value)
		definitionDisp = <input type="number" onChange={numberChange} defaultValue={definition}/> //def is numerical interpretation of this
	} else if (typeof value === 'string') { //string primitive
		valueDisp = JSON.stringify(value)
		definitionDisp = JSON.stringify(definition)
	} else if (typeof definition === 'boolean') { //bool primitive
		valueDisp = JSON.stringify(value)//make checkbox
		definitionDisp = JSON.stringify(definition)
	//} else if (definition.type === 'set' ) {
	//} else if (definition.type === 'condition' ) {
	} else { //error or not implemented condition

		definitionDisp = 'unsupported'
	}
	return (
		<div style={{ padding: 10, borderTop: '1px solid #aaa' }}>
			{attrId}:
			<div style={{ paddingLeft: 40, paddingTop: 3 }}>
				{definitionDisp} ({valueDisp})
			</div>
		</div>
	)
}
const mapStateToProps = (state, props) => ({
	definition: getDef(state, props.objectId, props.attrId),
	value: getValue(state, props.objectId, props.attrId)
})

const mapDispatchToProps = (dispatch) => ({
	setProp: (objectId, attrId, value) => {
		dispatch(ObjectActions.setProp(objectId, attrId, value))
	},
	setActiveObject: (id) => {
		dispatch(ObjectActions.setActiveObject(id))
	}
})

export default connect(mapStateToProps, mapDispatchToProps)(AttributeTab)
