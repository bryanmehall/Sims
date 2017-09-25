import React from "react"
import ValueOverlay from './ValueOverlay'
import ReactDOM from "react-dom"
import {connect} from "react-redux"
import { bindActionCreators } from 'redux'
import QuantityActions from '../ducks/quantity/actions'
import {getChildren} from '../ducks/object/selectors'
import Value from './Value'
import EqText from './EqText'

class Expression extends React.Component{
	constructor(props){
		super(props)
		this.updateWidth = this.updateWidth.bind(this)
	}
	componentWillReceiveProps(){
		this.dw = 0
	}
	componentDidUpdate(){
	}
	updateWidth(dw){
		this.dw+=dw
		console.log('updating', dw)
	}
	render(){
		const self = this
		const childData = this.props.childData
		const pos = this.props.pos
		const activeElements = this.props.childData.filter((child) => (child.props.active))

		var childTypes = {
			Expression,
			Value,
			EqText
		}

		function createChild(childData,i){
			var type = childTypes[childData.type]
			var props = childData.props
			props.key = props.id
            props.ref = props.id
			props.index = i
			props.updateWidth = self.updateWidth
			props.isSubExpression = true
			return React.createElement(type, props)
		}

        this.children = this.props.childData.map(createChild)

		return (
			<div style={{position:'absolute', top:pos.y, left:pos.x}}>
				{this.children}
			</div>
		)
	}
}


function mapStateToProps(state, props) {
	return {
		childData: getChildren(state, props.id)
	}
}

function mapDispatchToProps(dispatch) {
	return {
		/*setHighlight:(name, value) => {
			dispatch(QuantityActions.setHighlight(name, value))
		},
		setPlay:(name, value) => {
			dispatch(QuantityActions.setPlay(name, value))
		}*/
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Expression);
