import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getDef, getValue, getObject } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import ObjectLink from './ObjectLink'
//import ReactTags from 'react-tag-autocomplete'

const valueBlockStyle = { paddingLeft: 40, paddingTop: 3, display: 'flex' }
const parenStyle = { fontSize: 20, marginTop: -3 }
const ValueTab = ({ definition, value, defData, valueData, setActiveObject }) => {

	return (
		<div style={valueBlockStyle}>
			<ObjectLink objectId={definition} />
			<div style={parenStyle}>(</div>
			<ObjectLink objectId={value} />
			<div style={parenStyle}>)</div>
		</div>
	)
}

const mapStateToProps = (state, props) => {
	const value = getValue(state, props.objectId, props.attrId)
	const definition = getDef(state, props.objectId, props.attrId)
	const valueData = getObject(state, value)
	const defData = getObject(state, definition)
	return {
		definition,
		value,
		valueData,
		defData
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

export default connect(mapStateToProps, mapDispatchToProps)(ValueTab)
