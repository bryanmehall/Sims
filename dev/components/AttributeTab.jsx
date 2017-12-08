import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getJSValue } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
//import ReactTags from 'react-tag-autocomplete'
import ValueTab from './ValueTab'

const AttributeTab = ({ objectData, attr }) => (
	<div style={{ padding: 10, borderTop: '1px solid #aaa' }}>
		{attr.props.id}:
		<ValueTab objectData={objectData} attrId={attr.props.id}/>
	</div>
)
const mapStateToProps = (state, props) => {
	return {}
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
