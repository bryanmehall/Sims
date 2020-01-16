import React from "react";
import {connect} from "react-redux"
import { bindActionCreators } from 'redux';
import QuantityActions from '../ducks/quantity/actions';
import {getTransformedValue, getValue, getCoordSys, getQuantityData, getColor} from '../ducks/quantity/selectors'
import Draggable from "./Draggable"
import Path from './Path'
import Label from './Label'


class Vector extends React.Component {
	constructor(props){
		super(props)
		this.dragStart = this.dragStart.bind(this)
		this.dragMove = this.dragMove.bind(this)
		this.dragEnd = this.dragEnd.bind(this)
	}
	dragStart(initPos){

		this.offset = {
			x:this.props.tipX-initPos.x,
			y:this.props.tipY-initPos.y
		}

		//this.props.setX0(this.startOffset, this.props.coordSys.yScale)
	}
	dragMove(pos){
		const newPos = {
			x:pos.x+this.offset.x-this.props.tailX,
			y:pos.y+this.offset.y-this.props.tailY
		}
		this.props.setPos( this.props.x, newPos.x, this.props.y, -newPos.y, this.props.vectorCoordSys)
		//this.props.setX0(newYPos, this.props.coordSys.yScale)
	}
	dragEnd(endPos){

	}
	render(){
		const {tipX, tipY, tailX, tailY, color} = this.props
		const opacity = this.props.opacity || 1
		const draggable = this.props.draggable || false
		const dragHandle = (
			<Draggable
				dragStart={this.dragStart}
				dragMove={this.dragMove}
				>
				<circle
					cx={tipX}
					cy={tipY}
					r={10}
					>
				</circle>
			</Draggable>
		)
		const dx = tipX-tailX,
			  dy = tipY-tailY,
			  length = Math.sqrt(dx*dx+dy*dy),
			  angle = Math.atan2(dy, dx)*180/Math.PI
		const arrowPath = calcVector(length, 10)
		const transform = `translate(${tailX},${tailY}) rotate(${angle})`
		return (
			<g style={{opacity:opacity}}>

				<Path
					style={{ pointerEvents:'none'}}
					points={arrowPath}
					transform={transform}
					fill={this.props.color}
					strokeWidth="0"
					/>
				<Label x={tailX+dx/2} y={tailY+dy/2} label={this.props.label} />
				{draggable ? dragHandle : null}
			</g>
    	)
  }
}




function mapStateToProps(state, props) {
	var br = props.boundingRect
	const tailCoordSys = getCoordSys(state, props.tailX, props.tailY, br)

	const tailX = getTransformedValue(state, props.tailX, tailCoordSys.xScale),
		  tailY = getTransformedValue(state, props.tailY, tailCoordSys.yScale),
		  vectorCoordSys = getCoordSys(state, props.x, props.y, {xMin:0, yMin:0, xMax:50, yMax:50}),
		  dx = getTransformedValue(state, props.x, vectorCoordSys.xScale),
		  dy = getTransformedValue(state, props.y, vectorCoordSys.yScale),

		  tipX = dx+tailX,
		  tipY = -dy+tailY
	//console.log(vectorCoordSys,props.x, dx, dy)
	return {
		tailX,
		tailY,
		tipX,
		tipY,
		vectorCoordSys,
		color:getColor(state, props.x)
	};
}

function mapDispatchToProps(dispatch) {
	return {
		setPos:( xName, xValue, yName, yValue, coordSys) => {
			dispatch([
				QuantityActions.setValueFromCoords(xName, xValue, coordSys.xScale),
				QuantityActions.setValueFromCoords(yName, yValue, coordSys.yScale)
			])

		},
		setValue:(name, value) => {
			dispatch(QuantityActions.setValue(name, value))
		},
		setPlay:(name, value) => {
			dispatch(QuantityActions.setPlay(name, value))
		},
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Vector);
function calcVector(l, w, tw, ar){
	//tailPosition, tipPosition, width of arrow,width of tip, tipWidth/tipLength
	ar = ar || Math.sqrt(3)
	tw = tw || 2*w

	if (Math.abs(l)<tw/ar){
		tw = Math.abs(l)*ar
	}
	var tipL = tw/ar*Math.sign(l)
	return [
		{x:0, y:-w/2},
		{x:l-tipL, y:-w/2},
		{x:l-tipL, y:-tw/2},
		{x:l, y:0},
		{x:l-tipL, y:tw/2},
		{x:l-tipL, y:w/2},
		{x:0, y:w/2}
	]
}
