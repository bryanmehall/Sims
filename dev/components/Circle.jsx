import React from "react"
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import { getValue, getColor, getHighlighted, getTransformedValue, getCoordSys, getQuantityData } from '../ducks/quantity/selectors'
import { getCurrentCourseId, getCurrentPartId, getCurrentContentBlockId } from '../ducks/content/selectors'
import { getChildren, getValue as getPropValue } from '../ducks/object/selectors'
import Draggable from "./Draggable"
import { HighlightFilter } from './filters'




class Circle extends React.Component {
	render() {
		const { radius, cx, cy } = this.props
		return (
			<g>
				{/*stringHighlight !== 0 ? stringFilter : null*/}
				<circle
					r={radius}
					cx={cx}
					cy={cy}
					/>
			</g>
		)
	}
}

Circle.propTypes = {
	r: PropTypes.number,
}

Circle.defaultProps = {
	r: 0
}

function mapStateToProps(state, props) {
	const posObject = getPropValue(state, props.id, 'centerPoint')
	return {
		radius: getPropValue(state, props.id, 'radius'),
		cx: getPropValue(state, posObject, 'x'),
		cy: getPropValue(state, posObject, 'y')

	}
}

function mapDispatchToProps(dispatch) {
	return {
	}
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Circle);
