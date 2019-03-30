import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getValue, objectLib } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import ObjectLink from './ObjectLink'
import ObjectSearch from './ObjectSearch'
//import ReactTags from 'react-tag-autocomplete'

const valueBlockStyle = { paddingLeft: 40, paddingTop: 3, display: 'flex' }
const parenStyle = { fontSize: 20, marginTop: -3 }

const ValueTab = ({ definition, value, objectData, attrId, setProp }) => {
	const objectId = objectData.props.id
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
		if (definition === undefined){
			return <div>undef</div>
		}
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
		setProp(objectId, attrId.props.id, "undef")
	}
	const deleteButton = (
		<div
			onClick={removeDef}
			style={{ cursor: 'pointer', padding: 3, marginBottom: 5, color: 'red' }}
			>
			x
		</div>
	)
	const isPrimitive = definition !== undefined && !definition.hasOwnProperty('props')
	const isUndefined = definition === undefined

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
				<div>{JSON.stringify(definition)}</div>
				<div style={parenStyle}>)</div>
			</div>
		)
	} else {
		const definitionDisplay = (
			<ObjectLink
				parentData={{ type: 'undef', props: { id: 'undef' } }}
				attrId={attrId}
				objectData={definition}
				magicPlaceholder={true}
			/>
		)
		return (
			<div style={valueBlockStyle}>
				{isUndefined ? objectSearch : definitionDisplay}
				{deleteButton}
				<div style={parenStyle}>(</div>
				<ObjectLink parentData={objectData} attrId={attrId} objectData={value} />
				<div style={parenStyle}>)</div>
			</div>
		)
	}

}


const mapStateToProps = (state, props) => {
	const stringDef = props.objectData.props[props.attrId]
	const value = props.attrId === 'id' ? props.objectData.props.id :
		getValue(state, props.attrId, props.objectData)
	//const definition = typeof stringDef === 'string' ? objectLib.constructSearch(stringDef) : stringDef
	return {
		//definition,
		value
	}
}

const mapDispatchToProps = (dispatch) => ({
	setProp: (objectId, attrId, value) => {
		dispatch(ObjectActions.setProp(objectId, attrId, value))
	}
})

export default connect(mapStateToProps, mapDispatchToProps)(ValueTab)
