import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getProp } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'

const AttributeTab = ({ objectId, attrId, definition, setProp }) => {
	let value = 'unsupported'
	if (typeof definition === 'number'){
		const numberChange = (e) => {
			const charCode = (typeof e.which == "number") ? e.which : e.keyCode
			if (charCode === 92){

			} else if (charCode === 13){
				setProp(objectId, attrId, parseFloat(e.target.value))
			}
		}
		value = JSON.stringify(definition)
		definition = <input type="number" onKeyPress={numberChange} placeholder={definition}/> //def is numerical interpretation of this
	} else if (typeof definition === 'string'){
		value = JSON.stringify(definition)
		definition = JSON.stringify(definition)
	} else {
		definition = 'unsupported'
	}

	return (
		<div>{attrId}: {definition} ({value})</div>
	)
}
const mapStateToProps = (state, props) => ({
	definition: getProp(state, props.objectId, props.attrId)
})

const mapDispatchToProps = (dispatch) => ({
	setProp: (objectId, attrId, value) => {
		dispatch(ObjectActions.setProp(objectId, attrId, value))
	}
})

export default connect(mapStateToProps, mapDispatchToProps)(AttributeTab)
