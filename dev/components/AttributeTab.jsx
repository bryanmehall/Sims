import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getDef, getValue } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
//import ReactTags from 'react-tag-autocomplete'
import ValueTab from './ValueTab'
const valueBlockStyle = { paddingLeft: 40, paddingTop: 3, display: 'flex' }

const AttributeTab = ({ objectId, attrId, definition, value, setProp }) => {
	let definitionDisp = ''
	let valueDisp = ''
	let valueBlock = ''
	const numberChange = (e) => {
		const value = parseFloat(e.target.value) || 0
		const primitive = { type: 'number', value: value }
		setProp(objectId, attrId, primitive)
		const charCode = (typeof e.which == "number") ? e.which : e.keyCode
		if (charCode === 13){ //backslash is keycode 92
			setProp(objectId, attrId, primitive)
		}
	}
	if (definition === undefined) {
		throw new Error(`definition is undefined for ${objectId}.${attrId} def:${JSON.stringify(definition)}, value:${value}`)
	} else if (typeof definition === 'string') {
		valueBlock = <ValueTab objectId={objectId} attrId={attrId}/>
	} else if (attrId === 'jsPrimitive') { //leaving primitive out of set for now -- good idea?
		definitionDisp = `${definition.type} primitive`
		valueDisp = JSON.stringify(value)
		if (definition.hasOwnProperty('value')){
			definitionDisp = <input type="number" onChange={numberChange} defaultValue={definition.value}/>
		}
		valueBlock = (
			<div style={valueBlockStyle}>
				{definitionDisp} ( {valueDisp} )
			</div>
		)
	} else { //error or not implemented condition
		valueBlock = 'unsupported'
	}


	return (
		<div style={{ padding: 10, borderTop: '1px solid #aaa' }}>
			{attrId}:
			{valueBlock}
		</div>
	)
}
const mapStateToProps = (state, props) => {
	const value = getValue(state, props.objectId, props.attrId)
	return {
		definition: getDef(state, props.objectId, props.attrId),
		value
	}
}

const mapDispatchToProps = (dispatch) => ({
	setProp: (objectId, attrId, value) => {
		dispatch(ObjectActions.setProp(objectId, attrId, value))
	},
	setActiveObject: (id) => {
		dispatch(ObjectActions.setActiveObject(id))
	}
})

export default connect(mapStateToProps, mapDispatchToProps)(AttributeTab)
