import React from 'react'
import { mathVarStyle, mathTextStyle } from './styles'

class Label extends React.Component {
	render() {
		const rawText = this.props.label || ''
		let symbol
		const underscoreIndex = rawText.indexOf("_")
		if (underscoreIndex === -1){
			symbol = (
				<text
					style={mathVarStyle}
					x={this.props.x}
					y={this.props.y}
					>
					{rawText}
				</text>
			)
		} else {
			const text = rawText.substring(0, underscoreIndex)
			const sub = rawText.substring(underscoreIndex+1)
			symbol = (
				<text
					style={mathVarStyle}
					x={this.props.x}
					y={this.props.y}
					>{text}
					<tspan
						fontSize="62%"
						dy="3"
						>{sub}</tspan>
				</text>
			)
		}
    return symbol
  }
}
export default Label
