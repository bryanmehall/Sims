import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getDef, getValue } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import ObjectLink from './ObjectLink'
import ObjectSearch from './ObjectSearch'
//import ReactTags from 'react-tag-autocomplete'

const valueBlockStyle = { paddingLeft: 40, paddingTop: 3, display: 'flex' }
const parenStyle = { fontSize: 20, marginTop: -3 }

const ValueTab = ({ definition, value, objectId, attrId, setProp }) => {
	const numberChange = (objectId, e) => {
		const value = parseFloat(e.target.value) || 0
		const primitive = { type: 'number', value: value }
		setProp(objectId, 'jsPrimitive', primitive)
		const charCode = (typeof e.which == "number") ? e.which : e.keyCode
		if (charCode === 13){ //backslash is keycode 92
			setProp(objectId, 'jsPrimitive', primitive)
		}
	}
	const boolChange = (objectId, e) => {
		const value = e.target.checked
		const primitive = { type: 'bool', value: value }
		setProp(objectId, 'jsPrimitive', primitive)
	}
	const stringChange = (objectId, e) => {
		const value = e.target.value
		const primitive = { type: 'string', value: value }
		setProp(objectId, 'jsPrimitive', primitive)
	}
	const defDisplay = (definition, objectId) => {
		if (definition.hasOwnProperty('value')) {
			switch (definition.type) {
				case 'number': {
					return <input type="number" onChange={(e) => (numberChange(objectId, e))} defaultValue={definition.value}/>
				}
				case 'bool': {
					return <input type="checkbox" onChange={(e) => (boolChange(objectId, e))} checked={definition.value}/>
				}
				case 'string': {
					return <input onChange={(e) => (stringChange(objectId, e))} defaultValue={definition.value}/>
				}
			}
		} else {
			return `${definition.type} primitive`
		}
	}
	const removeDef = () => {
		setProp(objectId, attrId, "undef")
	}
	const deleteButton = (
		<div
			onClick={removeDef}
			style={{ cursor: 'pointer', padding: 3, marginBottom: 5, color: 'red' }}
			>
			x
		</div>
	)
	const isPrimitive = typeof definition !== 'string'
	const isUndefined = definition === "undef"
	const objectSearch = <ObjectSearch objectId={objectId} attrId={attrId}/>
	if (isPrimitive) {
		const definitionDisplay = (
			<div>{defDisplay(definition, objectId)}</div>
		)
		return (
			<div style={valueBlockStyle}>
				{isUndefined ? objectSearch : definitionDisplay}
				{deleteButton}
				<div style={parenStyle}>(</div>
				<div>{JSON.stringify(value)}</div>
				<div style={parenStyle}>)</div>
			</div>
		)
	} else {
		const definitionDisplay = (
			<ObjectLink objectId={definition}/>
		)
		return (
			<div style={valueBlockStyle}>
				{isUndefined ? objectSearch : definitionDisplay}
				{deleteButton}
				<div style={parenStyle}>(</div>
				<ObjectLink objectId={value} />
				<div style={parenStyle}>)</div>
			</div>
		)
	}

}


const mapStateToProps = (state, props) => {
	const value = getValue(state, props.objectId, props.attrId)
	const definition = getDef(state, props.objectId, props.attrId)
	return {
		definition,
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

export default connect(mapStateToProps, mapDispatchToProps)(ValueTab)
