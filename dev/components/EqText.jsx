import React from "react"
import {connect} from "react-redux"

import QuantityActions from '../ducks/quantity/actions'
import ObjectActions from '../ducks/object/actions'
import {mathTextStyle} from './styles'


class EqText extends React.Component {
	render(){
		return <span style={{...mathTextStyle}} >{this.props.text}</span>
	}
}

function mapStateToProps(state, props) {
	return {}// needed?
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
		}
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EqText);
