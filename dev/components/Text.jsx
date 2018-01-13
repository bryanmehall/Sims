import React from "react"
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import ObjectActions from '../ducks/object/actions'




class Text extends React.Component {
	render() {
		const { x, y, string, font, color, fontSize } = this.props
		return (
			<text
				x={x}
				y={y}
			>
				{string}
			</text>

		)
	}
}



function mapStateToProps() {
	return {}
}

function mapDispatchToProps(dispatch) {
	return {
		setProp: (objectId, attrId, value) => {
			dispatch(ObjectActions.setProp(objectId, attrId, value))
		},
		setActiveObject: (id) => {
			dispatch(ObjectActions.setActiveObject(id))
		}
	}
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Text);
