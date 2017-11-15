import React from "react"
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import ObjectActions from '../ducks/object/actions'
import { getCurrentCourseId, getCurrentPartId, getCurrentContentBlockId } from '../ducks/content/selectors'
import { getJSValue } from '../ducks/object/selectors'
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

	const posObject = props.centerPoint
	return {
		radius: getJSValue(state, props.id, 'radius') || 10,
		cx: getJSValue(state, posObject, 'x') || 0,
		cy: getJSValue(state, posObject, 'y') || 0,
		highlighted: getJSValue(state, props.id, 'highlighted')
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
