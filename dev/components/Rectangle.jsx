import React from "react"
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import ObjectActions from '../ducks/object/actions'

class Rectangle extends React.Component {
	render() {
		const { x, y, width, height, color } = this.props
		return (
			<rect
				x={x}
				y={y}
				width={width}
                height = {height}
                fill = {color || 'black'}
                opacity= {0.2}
			/>

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
)(Rectangle);
