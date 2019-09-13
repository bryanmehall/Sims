import React from "react"
import { connect } from "react-redux"
import SimActions from '../ducks/sim/actions'
import ObjectActions from '../ducks/object/actions'
import { getLoadState } from '../ducks/sim/selectors'
import { Runtime } from '../ducks/object/runtime'
import Debug from './Debug'
import { cardStyle } from './styles'
import Link from 'redux-first-router-link'

class Sim extends React.Component {
	constructor(props){
		super(props)
		this.loadSim = this.loadSim.bind(this)
        this.state = {
            offset: { x: 300, y: 0 },
             //each of these is a function
            runtime: null,
            debugView: 'flow' //tree or other
        }
	}

	componentDidMount(){
		const contentBlockId = this.props.contentBlockId
		this.loadSim(contentBlockId)
        this.canvas = document.getElementById('canvas')
	}
    componentDidUpdate(nextProps){
        const updateFunction = (runtime) => {
            this.setState({ runtime: runtime })
        }
        if (this.props.loadState === 'loaded' && this.state.runtime === null){
            this.runtime = new Runtime(this.props.state.sim.lynxText, this.canvas, updateFunction)
        }

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
	render(){
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
			width: 600,
			height: 400,
			position: "relative",
			overflow: 'hidden',
			left: 0,
			top: 0,
			float: 'left',
			backgroundColor: '#fff' 
		}

        const debug = this.props.loadState !=='loading' ?
              <Debug
                  runtime = {this.state.runtime}
                  debugType={this.state.debugView}
                ></Debug> : null

		return (
            <div>
                <canvas
                    id="canvas"
                    width="600"
                    height="600"
                    style={simCardStyle}
                >
                </canvas>
                <div style = {{ ...cardStyle, backgroundColor: 'white', padding: 10, top: 505 }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => { this.setState({ debugView: "tree" }) }}>tree</span> |
                    <span style={{ cursor: 'pointer' }} onClick={() => { this.setState({ debugView: "ast" }) }}> ast</span> |
                    <span style={{ cursor: 'pointer' }} onClick={() => { this.setState({ debugView: "code" }) }}> code</span> |
                    <span style={{ cursor: 'pointer' }} onClick={() => { this.setState({ debugView: "flow" }) }}> flow</span>
                </div>
                {debug}
            </div>
        )
        /*(

			<svg
				style={simCardStyle}
				onMouseMove = {setMousePos}
				onMouseDown = {setMouseDown}
				onMouseUp = {setMouseUp}>

				{this.props.loadState === 'error' ? 'Error: Failed to Load Simulation' : null}
				<Group children={this.props.childData.children}></Group>
			</svg>
		)*/
	}
}

function mapStateToProps(state) {
	const loadState = getLoadState(state)
	if (loadState === 'loading'){
		return { loadState, childData: { type: "Group", children: [] } }
	} else {
		return {
            state,
			loadState,
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
