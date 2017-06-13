import React, {PropTypes} from "react"
import {connect} from "react-redux"
import { bindActionCreators } from 'redux';
import * as QuantityActions from '../ducks/quantity/actions';
import {getValue} from '../ducks/quantity/selectors'
import {getChildren} from '../ducks/widget/selectors'
import Scale from './Scale'
import Slider from './Slider'
import Plot from './Plot'
import Abstraction from './Abstraction'
import Expression from './Expression'
import Value from './Value'
import SideBar from './SideBar'

class SmdApp extends React.Component {
	constructor(props){
		super(props)
	}
	render(){
		const { actions } = this.props;
		var childTypes = {
			"Plot": Plot,
			"Expression": Expression
		}

		function createChild(childData){
			var type = childTypes[childData.type]
			var props = childData.props
			props.key = props.id
			return React.createElement(type, props)
		}
		var children = this.props.childData.map(createChild)
		var app = this
		var appStyle = {
			display: 'flex'
		}
		return (
			<div >
				<div style={{backgroundColor:"#666", height:40, borderBottom:"3px solid #ccc"}}></div>
				<div style={appStyle}>
					<SideBar></SideBar>
					<div style={{flexGrow: 1}}>
						<svg width={700} height={600} >
						<defs>
							<filter id="highlight" primitiveUnits="userSpaceOnUse">
								<feMorphology operator="dilate" radius="1.5" in="SourceAlpha" result="expanded"/>
								<feFlood floodColor="#80d8ff" result="highlightColor"/>
								<feComposite in="highlightColor" in2="expanded" operator="in" result="expandedColored" />
								<feGaussianBlur stdDeviation="2" in="expandedColored" result="highlight"/>
								<feComposite operator="over" in="SourceGraphic" in2="highlight"/>
							 </filter>
							<filter id="textBackground" primitiveUnits="userSpaceOnUse">
								<feMorphology operator="dilate" radius="100" in="SourceAlpha" result="expanded"/>
								<feFlood floodColor="white" result="highlightColor"/>
								<feComposite in="highlightColor" in2="expanded" operator="in" result="expandedColored" />
								<feGaussianBlur stdDeviation="1" in="expandedColored" result="highlight"/>
								<feComposite operator="over" in="SourceGraphic" in2="highlight"/>
							 </filter>
						</defs>
						{children}
						</svg>
					</div>
				</div>


			</div>
            )
	}
}
SmdApp.PropTypes = {
	actions: PropTypes.object.isRequired
};

function mapStateToProps(state, props) {
	return {
		childData: getChildren(state, 'app')
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
)(SmdApp);
