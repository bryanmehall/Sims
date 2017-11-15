import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getDef } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
//import ReactTags from 'react-tag-autocomplete'
import ValueTab from './ValueTab'

const AttributeTab = ({ objectId, attrId, definition}) => {

	if (definition === undefined) {
		throw new Error(`definition is undefined for ${objectId}.${attrId} def:${JSON.stringify(definition)}`)
	} else {
		return (
			<div style={{ padding: 10, borderTop: '1px solid #aaa' }}>
				{attrId}:
				<ValueTab objectId={objectId} attrId={attrId}/>
			</div>
		)
	}

}
const mapStateToProps = (state, props) => {
	return {
		definition: getDef(state, props.objectId, props.attrId)
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
