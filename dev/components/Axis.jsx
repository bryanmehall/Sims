import React from 'react';
import { dist, angle, rotate } from '../utils/point'
import { axisLabelStyle } from './styles'

function tickValues(min, max){
	var spacing = tickSpacing(min, max)
	var minTick = Math.floor(min / spacing) * spacing
	var values = []
	var value = minTick
	while (value <= max){
		values.push(value)
		value += spacing
	}
	return values

	function tickSpacing(min, max, minTics=5, maxTics=8, niceValues=[1,2,5]) {
		var range = max - min
		var nearestOrderOfMagnitude = Math.floor(Math.log10(range))
		var niceRange = Math.pow(10.0, nearestOrderOfMagnitude)
		if (range / (niceRange/1) >= minTics){ //spacing 10*10^n less tics
			return niceRange/1;
		} else if (range / (niceRange / 2.0) >= minTics) {
			return niceRange / 2.0; //spacing 5*10^n
		} else if (range/ (niceRange/5) >=minTics){
			return niceRange / 5.0; //spacing 2*10^n more tics
		}
	}
}

class Axis extends React.Component {
	render(){
		const showBar = this.props.showBar !== false; //true to show axis bar

		const p1 = this.props.p1
		const p2 = this.props.p2
		const orthOffs = this.props.offs || 0 //offset to clockwise of p1,p2
		const length = dist(p1,p2)
		const a = angle(p1,p2)
		const min = this.props.min
		const max = this.props.max
		const tickVals = tickValues(min, max)
		const ticks = tickVals.map(drawTick)
		function drawTick(value,i){
			const frac = (value-min)/(max-min)
			const offs = frac*length
			const pos = rotate({ x: offs, y: orthOffs }, a)

			return (
				<g key={i}>
					<text
						x={pos.x+p1.x}
						y={pos.y+p1.y}
                        {...axisLabelStyle}
					>{value}</text>
				</g>
				)
		}
				//define base line
		var lineStyle = {
			"strokeWidth": 1,
			"stroke": "black",
			"strokeLinecap": "round"
		}

		const baseline = <line
			style = {lineStyle}
			x1={p1.x}
			x2={p2.x}
			y1={p1.y}
			y2={p2.y}
			/>

		return (
			<g>
				{ticks}
				{showBar ? baseline : null}
			</g>
		)
	}
}



export default Axis;
