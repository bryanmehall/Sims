import React from 'react'
import { connect } from 'react-redux'
import { Collapse } from 'react-collapse'
import { getProp } from '../ducks/widget/selectors'

const AttributeTab = ({objectId, attrId, definition}) => {
	const value = JSON.stringify(definition)
	return (
		<div>{attrId}: {value}</div>
	)
}
const mapStateToProps = (state, props) => {
	return {
		definition: getProp(state, props.objectId, props.attrId)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(AttributeTab)
