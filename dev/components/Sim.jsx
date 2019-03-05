import React, { PropTypes } from "react"
import { connect } from "react-redux"
import SimActions from '../ducks/sim/actions'
import ObjectActions from '../ducks/object/actions'
import { getLoadState } from '../ducks/sim/selectors'
import { compile } from '../ducks/object/selectors'
import Video from './Video'
import { Runtime } from '../ducks/object/runtime'
import Plot from './Plot'
import Circle from './Circle'
import Group from './Group'
import Expression from './Expression'
import Tracker from './Tracker'
import Debug from './Debug'
import { cardStyle } from './styles'
import Link from 'redux-first-router-link'
import TreeDiagram from './TreeDiagram'

class Sim extends React.Component {
	constructor(props){
		super(props)
		this.loadSim = this.loadSim.bind(this)
        this.state = {
            offset: { x: 300, y: 0 },
            inputs: { mouseX: 0, mouseY: 0, mouseDown: false },
             //each of these is a function
            objectTable: props.objectTable,
            ast: props.ast,
            debugView: 'tree' //tree or other
        }
	}

	componentDidMount(){
		const contentBlockId = this.props.contentBlockId
		this.loadSim(contentBlockId)
        this.canvas = document.getElementById('canvas')
	}
    componentDidUpdate(nextProps){
        const self = this
        if (this.props.loadState === 'loaded'){
            self.runtime = new Runtime(this.props.state, this.canvas)
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
			height: 200,
			position: "relative",
			overflow: 'hidden',
			left: 0,
			top: 0,
			float: 'left',
			backgroundColor: '#fff' 
		}
		//combine these into one file for importing children
        const functionTable = this.props.functionTable
        const tableVis = this.props.loadState ==='loading'
            ?'loading'
            :Object.keys(functionTable).map((func) => (
                  <pre key={func}>{func}:{functionTable[func].toString()}</pre>
              ))
        const codeVis = (
            <pre style={{ ...cardStyle, backgroundColor: "white", position: 'absolute', top: 300 }}>
                {this.props.loadState ==='loading' ? "loading" : this.props.renderMonad.toString() }
                {tableVis}
            </pre>
        )
        const treeVis = this.props.loadState !=='loading' ?
              <Debug
                  functionTable={functionTable}
                  ast={this.props.ast}
                  objectTable={this.props.objectTable}
                  appString={this.props.renderMonad.toString()}
                ></Debug> : null

        //const graphVis = <TreeDiagram objectTable={this.props.objectTable}></TreeDiagram>
		return (
            <div>
                <div style = {{backgroundColor:"white"}}>
                    <span onClick={()=>{this.setState({debugView:"code"})}}>Tree</span>
                    <span>code</span>
                </div>
                <canvas
                    id="canvas"
                    width="600"
                    height="600"
                    style={simCardStyle}
                >
                </canvas>

                {this.state.debugView === "tree" ? treeVis : codeVis}
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

const checkTypes = (type, vars) => {
    vars.forEach((variable)=>{
        if(typeof variable !== type){
            console.log('variables', vars)
            throw new Error(`Lynx typeError: type of ${variable} is not ${type}`)
        }
    })
}

function mapStateToProps(state) {
	const loadState = getLoadState(state)
	if (loadState === 'loading'){
		return { loadState, childData: { type: "Group", children: [] } }
	} else {
        console.time('draw')
		const { renderMonad, functionTable, ast, objectTable } = compile(state)

        console.timeEnd('draw')
		return {
            state,
			renderMonad,
            functionTable,
            ast,
			loadState,
            objectTable
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
