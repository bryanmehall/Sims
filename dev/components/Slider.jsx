import React from 'react';
import PropTypes from 'prop-types';
import { connect } from "react-redux"

import QuantityActions from '../ducks/quantity/actions';
import ObjectActions from '../ducks/object/actions'
import { getTransformedValue, getValue, getScale, getMin, getMax} from '../ducks/quantity/selectors'
import {getTransformString, getClosestPointOnLine} from '../utils/point'
import Draggable from "./Draggable"
import Axis from './Axis';
import Handle from "./Handle"
import {Scale} from '../utils/scale'
import {dist} from '../utils/point'

class Slider extends React.Component {
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
		this.startOffset = {
            x: this.props.pos.x-initPos.x, //offset in px
            y: this.props.pos.y-initPos.y
        }

	}

	dragMove(newPos){
		const pos = {
            x: newPos.x+this.startOffset.x,
            y: newPos.y+this.startOffset.y
        }
        const closestPoint = getClosestPointOnLine(pos, this.props.p1, this.props.p2)
        const frac = dist(closestPoint, this.props.p1)/this.props.length
        const value = frac*(this.props.max-this.props.min)+this.props.min
		this.props.setValue(this.props.quantity, value)
	}

	dragEnd(endPos){
		const onDragEnd = this.props.onDragEnd
		if (typeof onDragEnd == 'function') {
			onDragEnd(this.props, endPos)
		}
	}
	render() {
		const p1 = this.props.p1
		const p2 = this.props.p2
		const min = this.props.min
		const max = this.props.max
        const pos = this.props.pos
		const quantity = this.props.quantity
        const value = this.props.value
		const scale = this.props.scale
        const width = this.props.width || 0 //only works for vertical for now
		const lengthOffset = this.props.lengthOffset || 0
		const barStyle = {
			"strokeWidth": "3",
			"stroke": "#0ee",
			"strokeLinecap": "round"
		}
		const axis = <Axis
			p1={p1}
			p2={p2}
			min={min}
			max={max}
			showBar={false}
		/>
        const bar = (width !== 0) ? (
            <rect
                x={p1.x-width/2-1}
                y={p2.y-lengthOffset-1}
                width={width+2}
                rx="6"
                ry="6"
                fill="white"
                strokeWidth={2}
                stroke="rgb(208, 208, 208)"
                height = {this.props.length+2*lengthOffset+2}>
            </rect>
                ):(
            <line
                style={barStyle}
                x1={p1.x}
                x2={p2.x}
                y1={p1.y}
                y2={p2.y}
            />
        )
		return (
			<g>

				{bar}
				{this.props.showAxis ? axis : null}
				<Draggable
					dragStart={this.dragStart}
					dragMove={this.dragMove}
					dragEnd={this.dragEnd}
					>
                    <g transform = {getTransformString(pos)}>
                        {this.props.children}
                    </g>
				</Draggable>

			</g>
		);
	}
}

function mapStateToProps(state, props) {
	//add support for full coordinate system

    const min = props.min || getMin(state, props.quantity)
    const max = props.max || getMax(state, props.quantity)
    const value = props.value || getValue(state, props.quantity)

    const length = dist(props.p1,props.p2)
    const dx = props.p2.x-props.p1.x
    const dy = props.p2.y-props.p1.y
    const frac = (value-min)/(max-min)
    const pos = {
        x: frac*dx+props.p1.x,
        y: frac*dy+props.p1.y
    }
	var scale = getScale(state, props.quantity, min, max)
	return {
		scale: scale,
        min: min,
        max:  max,
        pos: pos,
        length: length,
        value: value
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
)(Slider);



