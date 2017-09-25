import React from "react";
import { connect } from "react-redux"

import QuantityActions from '../ducks/quantity/actions';
import ObjectActions from '../ducks/object/actions'
import { getTransformedValue, getValue, getScale, getPlaying, getQuantityData } from '../ducks/quantity/selectors'
import Draggable from "./Draggable"


class Handle extends React.Component {
	constructor(props){
		super(props)
		this.dragStart = this.dragStart.bind(this)
		this.dragMove = this.dragMove.bind(this)
		this.dragEnd = this.dragEnd.bind(this)
	}

	dragStart(initPos){
		const onDragStart = this.props.onDragStart
		if (typeof onDragStart == 'function') {
			onDragStart(this.props, initPos);
		}
		this.startOffset = this.props.pos.x-initPos.x //offset in px

	}

	dragMove(newPos){
		var newPos = newPos.x+this.startOffset
		this.props.setTransformedValue(this.props.quantity, newPos, this.props.scale)
	}

	dragEnd(endPos){
		const onDragEnd = this.props.onDragEnd
		if (typeof onDragEnd == 'function') {
			onDragEnd(this.props, endPos)
		}
	}

	render(){
		var pos = this.props.pos
		var color = this.props.color || "#ddd"
		return (
			<Draggable
				dragStart={this.dragStart}
				dragMove={this.dragMove}
				dragEnd={this.dragEnd}
				>
				<circle
					cx={pos.x}
					cy={pos.y}
					r={7}
					fill={color}
					stroke="#666"/>
			</Draggable>
    )
  }
}

function mapStateToProps(state, props) {
	var br = props.boundingRect
	//add support for full coordinate system
	var scale = getScale(state, props.quantity, props.min, props.max)
	return {
		pos: {
			x: getTransformedValue(state, props.quantity, scale),
			y: props.y
		},
		scale: scale,
		playing: getPlaying(state, props.quantity)

	};
}

function mapDispatchToProps(dispatch) {
	return {
		setTransformedValue: (quantity, value, scale) => {
			dispatch(QuantityActions.setValueFromCoords(quantity, value, scale))
		},
		setValue: (name, value) => {
			dispatch(QuantityActions.setValue(name, value))
		},
		setActive: (name, value) => {
			dispatch(ObjectActions.setActive(name, value))
		},
		setPlay: (name, value) => {
			dispatch(QuantityActions.setPlay(name, value))
		},
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Handle);
