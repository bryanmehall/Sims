import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getDef, getValue } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'

const AttributeTab = ({ objectId, attrId, definition, value, setProp, setActiveObject }) => {
	let definitionDisp = ''
	let valueDisp = ''
	if (definition === undefined || value === undefined) {
		console.log('definition: ', definition, ' value: ', value )
		throw new Error(`definition is undefined for ${objectId}.${attrId}`)
	} else if (Array.isArray(definition)) { //object reference
		const goTo = () => {setActiveObject(value)}
		definitionDisp = definition.join('.')
		valueDisp = <span onClick={goTo} style={{backgroundColor:'#bbb'}}>{value}</span>
	} else if (typeof value === 'number'){ //number primitive
		const numberChange = (e) => {
			setProp(objectId, attrId, parseFloat(e.target.value)|| 0)
			const charCode = (typeof e.which == "number") ? e.which : e.keyCode
			if (charCode === 92){

			} else if (charCode === 13){
				setProp(objectId, attrId, parseFloat(e.target.value))
			}
		}
		valueDisp = JSON.stringify(value)
		definitionDisp = <input type="number" onChange={numberChange} placeholder={definition}/> //def is numerical interpretation of this
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
		<div>{attrId}: {definitionDisp} ({valueDisp})</div>
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
