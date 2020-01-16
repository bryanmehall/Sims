import React from "react";
import {connect} from "react-redux"
import { bindActionCreators } from 'redux'
import QuantityActions from '../ducks/quantity/actions'
import {getValue, getQuantityData, getAnimatable, getPlaying} from '../ducks/quantity/selectors'

class Animation extends React.Component {
	render() {
		var onPlay = this.props.onPlay
		var onPause = this.props.onPause
		var pos = this.props.pos
		var scale = this.props.scale || 0.8
		var color = this.props.color || 'gray'
		var self = this
		var pause = "M0,0 L9,5 9,15 0,20 M9,5 L18,10 18,10 9,15"
		var play = "M0,0 L7,0 7,20 0,20 M11,0 L18,0 18,20 11,20"
		var fromPath = this.props.wasPlaying ? pause : play
		var toPath = this.props.wasPlaying ? play : pause
		var hasQuantity = this.props.hasOwnProperty('quantity')
		//why does the button not change when paused externally?
		//We'll call it a feature...
		return (
			<path
				transform = {'matrix('+scale+' 0 0 '+scale +' '+ pos.x+' '+pos.y+')'}
				d={toPath}
				pointerEvents="bounding-box"
                
				fill={color}
				onClick={function(){
					if (!self.props.wasPlaying){
						if (typeof onPlay === 'function'){onPlay()}
					} else {
						if (typeof onPause === 'function'){onPause()}
					}

					self.props.setPlay(self.props.quantity, !self.props.wasPlaying)

				}}
				>

				<animate
					from={fromPath}
					to={toPath}
					begin="click"
					attributeType="XML"
					attributeName="d"
					fill="freeze"
					keySplines=".4 0 1 1"
					repeatCount="1"
					dur=".2s"
					></animate>
			</path>
		)
	}
}

function mapStateToProps(state, props) {
	var quantityData = getQuantityData(state, props.quantity)
	return {
		wasPlaying: getPlaying(state, props.quantity),
		value: getValue(state, props.quantity)

	};
}

function mapDispatchToProps(dispatch) {
	return {
		setHighlight:(name, value) => {
			dispatch(QuantityActions.setHighlight(name, value))
		},
		setActive:(name, value) => {
			dispatch(ObjectActions.setActive(name, value))
		},
		setPlay:(name, value) => {
			dispatch(QuantityActions.setPlay(name, value))
		},
		setValue:(name, value)=> {
			dispatch(QuantityActions.setValue(name, value))
		}
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Animation);
