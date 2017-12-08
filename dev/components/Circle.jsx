import React from "react"
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import ObjectActions from '../ducks/object/actions'




class Circle extends React.Component {
	render() {
		const { cx, cy, r } = this.props
		return (
			<circle
				r={r}
				cx={cx}
				cy={cy}
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
)(Circle);
