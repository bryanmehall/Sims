import React from "react"
import {connect} from "react-redux"
import { bindActionCreators } from 'redux';
import * as QuantityActions from '../ducks/quantity/actions';
import {getValue, getQuantityData, getSymbol} from '../ducks/quantity/selectors'
import {getChildren} from '../ducks/object/selectors'
import {mathVarStyle} from './styles'
import {CoordSys, Scale} from '../utils/scale'
import Axis from './Axis'
import Abstraction from './Abstraction'
import Mass from './Mass'
import Spring from './Spring'
import Anchor from './Anchor'
import Damper from './Damper'
import Pendulum from './Pendulum'
import Vector from './Vector'




class Plot extends React.Component {
	render(){
		var plotId = this.props.id,
			width = this.props.width,//width in px from axis min
			height = this.props.height,//height in px from axis min
			pos = this.props.pos,
			axisPadding = 50,
			borderPadding = 10,
			visibility = this.props.visibility !== undefined ? this.props.visibility: 1,
			xQuantities = this.props.xQuantities,
			yQuantities = this.props.yQuantities,
			xQuantity = xQuantities[this.props.xActive],
			yQuantity = yQuantities[this.props.yActive]

		var xScale = new Scale({//change to functional version
			min: xQuantity.min,
			max: xQuantity.max,
			tMin: axisPadding,
			tMax: width + axisPadding
		})
		var yScale = new Scale({
			min: yQuantity.min,
			max: yQuantity.max,
			tMin: height+borderPadding,
		  	tMax: borderPadding
		})
		var coordSys = new CoordSys(xScale, yScale)

		var childTypes = {
			Abstraction: Abstraction,
			Mass:Mass,
			Spring: Spring,
			Anchor: Anchor,
			Damper: Damper,
			Pendulum: Pendulum,
			Vector: Vector
		}

		function createChild(childData){
			var type = childTypes[childData.type]
			var props = childData.props
			props.key = props.id
			props.coordSys = coordSys
			props.boundingRect = {xMin:axisPadding, xMax:axisPadding+width, yMin:height+borderPadding, yMax:borderPadding}
			props.mask = plotId
			return React.createElement(type, props)
		}
		var children = this.props.childData.map(createChild)
		return (
			<svg
				style={{
					position:"absolute",
					left:pos.x-axisPadding,
					//backgroundColor:'gray',//for debug
					top:pos.y-height
				}}
				width={width+axisPadding+borderPadding}
				height={height+axisPadding+borderPadding}
				>
				<g opacity={visibility}>
					<defs>
						<mask id={plotId}>
							<rect x={axisPadding} y={borderPadding} width={width} height={height} fill="white" opacity="1" />
						</mask>
					</defs>
					{children}
					<Axis
						min={xScale.min}
						max={xScale.max}
						p1={{x:axisPadding, y:height+borderPadding}}
						p2={{x:width+axisPadding, y:height+borderPadding}}
						offs={15}
						/>
					<text
						x={width/2+axisPadding} y={height+axisPadding} textAnchor="middle" style={mathVarStyle}>{this.props.xLabel}
					</text>
					<Axis
						min={yScale.min}
						max={yScale.max}
						p1={{x:axisPadding, y:height+borderPadding}}
						p2={{x:axisPadding, y:borderPadding}}
						offs={-15}
						/>
					<text
						x={5}
						y={height/2+borderPadding}
						alignmentBaseline="middle"
						style={mathVarStyle}
						>
						{this.props.yLabel}
					</text>
				</g>
			</svg>
		)
	}
}

function mapStateToProps(state, props) {
	function getQuantities(quantityList){
		var quantities = {}
		quantityList.forEach(function(name){
			quantities[name] = getQuantityData(state, name)
		})
		return quantities
	}
	const xActive = props.xVars[0]
	const yActive = props.yVars[0]
	return {
		xActive,
		yActive,
		xLabel: getSymbol(state, xActive),
		yLabel: getSymbol(state, yActive),
		xQuantities: getQuantities(props.xVars),
		yQuantities: getQuantities(props.yVars),
		childData: getChildren(state,props.id)
	};
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(QuantityActions, dispatch)
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Plot);

