import React, { PropTypes } from "react"
import { connect } from "react-redux"
import SimActions from '../ducks/sim/actions'
import ObjectActions from '../ducks/object/actions'
import { getLoadState } from '../ducks/sim/selectors'
import { getJSValue, getObject } from '../ducks/object/selectors'
import Video from './Video'

import Plot from './Plot'
import Circle from './Circle'
import Group from './Group'
import Expression from './Expression'
import Tracker from './Tracker'
import { cardStyle } from './styles'
import Link from 'redux-first-router-link'

class Sim extends React.Component {
	constructor(props){
		super(props)
		this.loadSim = this.loadSim.bind(this)
		this.closeSim = this.closeSim.bind(this)
	}

	componentDidMount(){
		const contentBlockId = this.props.contentBlockId
		this.loadSim(contentBlockId)
	}
	componentWillReceiveProps(nextProps){
		//componentWill update takes next props as argument

		const contentBlockId = nextProps.contentBlockId
		if (this.props.contentBlockId !== contentBlockId) { //only update on change
			this.loadSim(contentBlockId)
		}
	}
	loadSim(contentBlockId){
		if (contentBlockId === null){

		} else {
			const url = `/courses/${this.props.courseId}/${this.props.partId}/${contentBlockId}`
			this.props.fetchSimData(url)
		}

	}
	closeSim(){

	}
	render(){
		const { contentBlockId, partId, courseId, setProp } = this.props
		const active = this.props.contentBlockId !== null
		const imageUrl = `/content/courses/${this.props.courseId}/${this.props.partId}/thumbnail.png`
		const image = (
			<Link to={`/courses/${this.props.courseId}/${this.props.partId}/${this.props.contentBlockId}`}>
				<img
					style={{
						maxWidth: '100%',
						maxHeight: '100%',
						margin: '0 auto',
						draggable: 'false' }} src={imageUrl}></img>
			</Link>
		)
		const simCardStyle = {
			...cardStyle, 
			width: 400,
			height: 400,
			position: "relative",
			overflow: 'hidden',
			left: 0,
			top: 0,
			float: 'left',
			backgroundColor: '#fff' 
		}
		//combine these into one file for importing children

		const setMousePos = (e) => {
			const x = e.pageX - e.currentTarget.offsetLeft
			const y = e.pageY - e.currentTarget.offsetTop
			setProp("mouseX", "jsPrimitive", { type: "number", id: 'mouseX', value: x })
			setProp("mouseY", "jsPrimitive", { type: "number", id: 'mouseY', value: y })
		}
		const setMouseDown = () => {
			setProp("mouseDown", "jsPrimitive", { type: "bool", id: 'mouseDown', value: true })
		}
		const setMouseUp = () => {
			setProp("mouseDown", "jsPrimitive", { type: "bool", id: 'mouseDown', value: false })
		}
		return (
			<svg
				style={simCardStyle}
				onMouseMove = {setMousePos}
				onMouseDown = {setMouseDown}
				onMouseUp = {setMouseUp}>
				{/*this.props.loadState === "loading" ? loadingIcon : null*/ }
				{this.props.loadState === 'error' ? 'Error: Failed to Load Simulation' : null}
				<Group children={this.props.childData.children}></Group>
			</svg>
		)
	}
}


function mapStateToProps(state) {
	const loadState = getLoadState(state)
	if (loadState === 'loading'){
		return { loadState, childData: { type: "Group", children: [] } }
	} else {
		//const childData = getJSValue(state, 'app', "childElements")
		const appData = getObject(state, 'app')
		const window = getJSValue(state, 'app', 'graphicalRepresentation', appData)
		//console.log(window)
		return {
			childData: window,
			loadState
		}
	}

}

function mapDispatchToProps(dispatch) {
	return {
		fetchSimData: (path) => {
			dispatch(SimActions.fetchSimData(path))
		},
		setProp: (object, prop, value) => {
			dispatch(ObjectActions.setProp(object, prop, value))
		}
	}
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Sim)
