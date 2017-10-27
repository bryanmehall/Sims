import React from "react"
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import ObjectActions from '../ducks/object/actions'
import { getCurrentCourseId, getCurrentPartId, getCurrentContentBlockId } from '../ducks/content/selectors'
import { getChildren, getValue as getPropValue } from '../ducks/object/selectors'
import Draggable from "./Draggable"
import { HighlightFilter } from './filters'




class Circle extends React.Component {
	render() {
		const { id, radius, cx, cy, setActiveObject, setProp, highlighted } = this.props
		const highlightFilter = <HighlightFilter id="highlightFilter" strength={5} color="#88f"></HighlightFilter>
		return (
			<g>
				{highlighted ? highlightFilter : null}
				<circle
					r={radius}
					cx={cx}
					cy={cy}
					filter={highlighted ? 'url(#highlightFilter)' : null}
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
	const highlighted = getPropValue(state, props.id, 'highlighted')
	return {
		radius: (radius === 'undef') ? 10 : getPropValue(state, radius, 'jsPrimitive'),
		cx: (cx === 'undef') ? 0 : getPropValue(state, cx, 'jsPrimitive'),
		cy: (cy === 'undef') ? 0 : getPropValue(state, cy, 'jsPrimitive'),
		highlighted: getPropValue(state, highlighted, 'jsPrimitive')
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
