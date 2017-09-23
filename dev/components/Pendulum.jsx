import React from "react"
import PropTypes from 'prop-types'
import {connect} from "react-redux"
import { bindActionCreators } from 'redux'
import QuantityActions from '../ducks/quantity/actions'
import SimActions from '../ducks/sim/actions'
import {getValue, getColor, getHighlighted, getTransformedValue, getCoordSys, getQuantityData} from '../ducks/quantity/selectors'
import {getCurrentCourseId, getCurrentPartId, getCurrentContentBlockId} from '../ducks/content/selectors'
import Path from "./Path"
import Draggable from "./Draggable"
import {HighlightFilter} from './filters'
import { dist } from "../utils/point"
import Label from './Label'




class Pendulum extends React.Component {

	render() {

		const {
			bobPos,
			anchorPos,
			stringHighlight,
			massHighlight,
			anchorHighlight,
			angleHighlight
		} = this.props
		const theta = Math.atan2(bobPos.x-anchorPos.x, bobPos.y-anchorPos.y)
		const length = dist(anchorPos, bobPos)
		const dragStart = (startPos) => {
			this.props.startUserInteraction(this.props.courseId, this.props.partId, this.props.contentBlockId)
			this.props.setPlay('t', false)
			this.props.setValue('t', 0)
			this.dragOffset = {
				x: startPos.x,
				y: startPos.y
			}
			this.initPos = {
				x: bobPos.x,
				y: bobPos.y
			}
		}
		const dragMove = (pos) => {
			const x = pos.x-this.dragOffset.x+this.initPos.x
			const y = pos.y-this.dragOffset.y+this.initPos.y
			const angle = Math.atan2(x-anchorPos.x, y-anchorPos.y)
			this.props.setInitialAngle(angle)
		}
		const moveMass = () => {
			this.props.setInitialAngle(0)
		}
		const dragEnd = (endPos) =>{
			this.props.setPlay('t', true)
		}
		const stringFilter = <HighlightFilter id="stringFilter" strength={stringHighlight*5} color='#88f'></HighlightFilter>
		const massFilter = <HighlightFilter id="massFilter" strength={massHighlight*5} color='#88f'></HighlightFilter>
		const anchorFilter = <HighlightFilter id="anchorFilter" strength={anchorHighlight*5} color='#88f'></HighlightFilter>
		const angleArc = `M${anchorPos.x} ${anchorPos.y+30} A30 30 0 0 ${theta<0 ? 1 : 0} ${anchorPos.x+30*Math.sin(theta)} ${anchorPos.y+30*Math.cos(theta)}`
		const angleLabel = (
			<g opacity={angleHighlight}>
				<path
					d={angleArc}
					fill="none"
					stroke="gray"
					strokeWidth={2}/>
				<line
					x1={anchorPos.x}
					y1={anchorPos.y}
					x2={anchorPos.x}
					y2={anchorPos.y+150}
					stroke="gray"
					strokeWidth={2}
					strokeDasharray = "5,5"
					/>
				<Label
					x={anchorPos.x+50*Math.sin(theta/2)}
					y={anchorPos.y+50*Math.cos(theta/2)}
					label="θ"
					/>
			</g>
		)
		return (
			<g>
				{stringHighlight !== 0 ? stringFilter : null}
				{massHighlight !== 0 ? massFilter : null}
				{anchorHighlight !== 0 ? anchorFilter : null}
				{angleLabel}
				<line
					x1={anchorPos.x+0.2/*hack for filter*/}
					y1={anchorPos.y}
					x2={bobPos.x}
					y2={bobPos.y}
					strokeWidth={2}
					stroke="black"
					filter={stringHighlight !== 0 ? "url(#stringFilter)" : null}
					/>
				<circle
					r={length}
					cx={anchorPos.x}
					cy={anchorPos.y}
					stroke='rgba(0,0,0,0.0)'
					fill="none"
					strokeWidth="40"
					onMouseDown = {moveMass}

					/>

				<Draggable
					dragStart={dragStart}
					dragMove={dragMove}
					dragEnd={dragEnd}
					>
					<circle
					r={20}
					cx={bobPos.x}
					cy={bobPos.y}
					stroke="black"
					fill="white"
					filter={massHighlight !== 0 ? "url(#massFilter)" : null}
					/>
				</Draggable>

				<circle
					r={10}
					cx={anchorPos.x}
					cy={anchorPos.y}
					filter={anchorHighlight !== 0 ? "url(#anchorFilter)" : null}
					/>

			</g>
		)
	}
}

Pendulum.propTypes = {
	bobX: PropTypes.string,
	bobY: PropTypes.string,
	anchorX: PropTypes.string,
	anchorY: PropTypes.string,
}

Pendulum.defaultProps = {
	stringHighlight: 0,
	massHighlight: 0,
	anchorHighlight: 0,
	angleHighlight: 0
}

function mapStateToProps(state, props) {
	var br = props.boundingRect //bounding rect of plot
	var coordSys = getCoordSys(state, props.bobX, props.bobY, br)
	return {
		bobPos:{
			x:getTransformedValue(state, props.bobX, coordSys.xScale),
			y:getTransformedValue(state, props.bobY, coordSys.yScale)
		},
		anchorPos:{
			x:getTransformedValue(state, props.anchorX, coordSys.xScale),
			y:getTransformedValue(state, props.anchorY, coordSys.yScale)
		},
		courseId:getCurrentCourseId(state),
		partId:getCurrentPartId(state),
		contentBlockId: getCurrentContentBlockId(state)
	}
}

function mapDispatchToProps(dispatch) {
	return {
		setInitialAngle:(value) => {
			dispatch(QuantityActions.setValue('theta0', value))
		},
		setValue:(name, value) => {
			dispatch(QuantityActions.setValue(name, value))
		},
		setPlay:(name, value) => {
			dispatch(QuantityActions.setPlay(name, value))
		},
		startUserInteraction: (courseId, partId, contentBlockId) => {
			dispatch((SimActions.startUserInteraction(courseId, partId, contentBlockId)))
		}
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Pendulum);
