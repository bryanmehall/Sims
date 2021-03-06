import React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from 'redux';
import * as QuantityActions from '../ducks/quantity/actions';
import { mathVarStyle } from './styles'
import Axis from './Axis'
import Abstraction from './Abstraction'
import Mass from './Mass'
import Spring from './Spring'
import Anchor from './Anchor'
import Damper from './Damper'
import Pendulum from './Pendulum'
import Vector from './Vector'
import Circle from './Circle'

class Plot extends React.Component {
	render(){

		const	axisPadding = 50,
			borderPadding = 10,
			visibility = this.props.visibility === undefined ? 1 : this.props.visibility//do not use or because 0 i sfalse

		const { xMin, yMin, xMax, yMax, plotId, width, height, pos } = this.props

		var childTypes = {
			Abstraction: Abstraction,
			Mass: Mass,
			Spring: Spring,
			Anchor: Anchor,
			Damper: Damper,
			Pendulum: Pendulum,
			Vector: Vector,
			Circle: Circle
		}

		function createChild(childData){
			var type = childTypes[childData.type]
			var props = childData.props
			props.key = props.id
			//props.coordSys = coordSys
			//props.boundingRect = {xMin:axisPadding, xMax:axisPadding+width, yMin:height+borderPadding, yMax:borderPadding}
			return React.createElement(type, props)
		}

		var children = this.props.childData.map(createChild)
		return (
			<svg
				style={{
					position: "absolute",
					left: pos.x-axisPadding,
					//backgroundColor:'gray',//for debug
					top: pos.y-height
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
						min={xMin}
						max={xMax}
						p1={{ x: axisPadding, y: height+borderPadding }}
						p2={{ x: width+axisPadding, y: height+borderPadding }}
						offs={15}
						/>
					<text
						x={width/2+axisPadding} y={height+axisPadding} textAnchor="middle" style={mathVarStyle}>{this.props.xLabel}
					</text>
					<Axis
						min={yMin}
						max={yMax}
						p1={{ x: axisPadding, y: height+borderPadding }}
						p2={{ x: axisPadding, y: borderPadding }}
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
	const id = props.id
	const xActive = props.xVars[0]
	const yActive = props.yVars[0]

	const posObject = props.pos
	const coordSys = props.coordinateSystem
	const xMin = getJSValue(state, coordSys, 'xMin')
	const xMax = getJSValue(state, coordSys, 'xMax')
	const yMin = getJSValue(state, coordSys, 'yMin')
	const yMax = getJSValue(state, coordSys, 'yMax')
	return {
		xActive,
		yActive,
		xMin,
		yMin,
		xMax,
		yMax,
		pos: {
			x: getJSValue(state, posObject, "x"),
			y: getJSValue(state, posObject, "y")
		},
		width: getJSValue(state, id, "width"),
		height: getJSValue(state, id, "height"),
		//xLabel: getSymbol(state, xActive),
		//yLabel: getSymbol(state, yActive),
		//xQuantities: getQuantities(props.xVars),
		//yQuantities: getQuantities(props.yVars),
		childData: []//get Children(state,props.id)
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

