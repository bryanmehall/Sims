import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getObject } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'

const UnconnectedObjectLink = ({ objectId, objectData, setActiveObject }) => {
	const linkStyle = {
		cursor: 'pointer',
		border: '1px solid #888',
		borderRadius: 4,
		backgroundColor: '#ccc'
	}
	let items = ''
	if (objectData.type === 'set'){
		const elements = objectData.props.jsPrimitive.elements
		items = elements.map(
			(element) => (
				<ObjectLink key={element} objectId={element}></ObjectLink>
			)
		)
	}
	return (
		<div>
			<div
				onClick={() => { setActiveObject(objectId) }}
				style={linkStyle}
			>
				{objectId}
			</div>
			<div>
				{items}
			</div>
		</div>
	)
}
const mapStateToProps = (state, props) => {
	return {
		objectData: getObject(state, props.objectId)
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
const ObjectLink = connect(mapStateToProps, mapDispatchToProps)(UnconnectedObjectLink)
export default ObjectLink
