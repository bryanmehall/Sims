import React from "react"
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import ObjectActions from '../ducks/object/actions'
import { getValue, getColor, getHighlighted, getTransformedValue, getCoordSys, getQuantityData } from '../ducks/quantity/selectors'
import { getCurrentCourseId, getCurrentPartId, getCurrentContentBlockId } from '../ducks/content/selectors'
import { getChildren, getValue as getPropValue } from '../ducks/object/selectors'
import Draggable from "./Draggable"
import { HighlightFilter } from './filters'




class Circle extends React.Component {
	render() {
		const { id, radius, cx, cy, setActiveObject, setProp } = this.props
		return (
			<g>
				{/*stringHighlight !== 0 ? stringFilter : null*/}
				<circle
					r={radius}
					cx={cx}
					cy={cy}
					onClick={() => { setActiveObject(id) }}
					onMouseOver={() => { setProp(id, 'highlighted', "true") }}
					onMouseOut={() => { setProp(id, 'highlighted', "false") }}
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
	const cx = getPropValue(state, posObject, 'x')
	const cy = getPropValue(state, posObject, 'y')
	const radius = getPropValue(state, props.id, 'radius')
	return {
		radius: (radius === 'undef') ? 10 : getPropValue(state, radius, 'jsPrimitive'),
		cx: (cx === 'undef') ? 0 : getPropValue(state, cx, 'jsPrimitive'),
		cy: (cy === 'undef') ? 0 : getPropValue(state, cy, 'jsPrimitive')
	}
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
