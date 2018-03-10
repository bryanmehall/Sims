import React, { PropTypes } from "react"
import { connect } from "react-redux"
import SimActions from '../ducks/sim/actions'
import ObjectActions from '../ducks/object/actions'
import { getLoadState } from '../ducks/sim/selectors'
import { compile } from '../ducks/object/selectors'
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
        let canvas = document.getElementById('canvas')
        this.width = canvas.getBoundingClientRect().width
        this.height = canvas.getBoundingClientRect().height
        canvas.width = this.width
        canvas.height = this.height

        this.ctx = canvas.getContext('2d')
	}
    componentDidUpdate(nextProps){
        let ctx = this.ctx
        const checkTypes = (type, vars) => {
            vars.forEach((variable)=>{
                if(typeof variable !== type){
                    console.log('variables', vars)
                    throw new Error(`Lynx typeError: type of ${variable} is not ${type}`)
                }
            })
        }
        this.prim = {
            rect:(x,y,width, height,r,g,b)=>{
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
                ctx.fillRect(x, y, width, height)
            },
            text: (x, y, innerText, r, g, b) => {
                const size=20
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
                ctx.font = `${size}px serif`
                checkTypes('number', [x,y,r,g,b])
                ctx.fillText(innerText || "undef", x, y)
            },
            clear: () => {
                ctx.clearRect(0, 0, this.width, this.height);
            }
        }
        const functionTable = this.props.functionTable
        this.render = this.props.renderMonad(functionTable)//returns compiled program
        this.render(this.prim, {mouseX:0, mouseY:0, mouseDown:false})
		const contentBlockId = nextProps.contentBlockId
		if (this.props.contentBlockId !== contentBlockId) { //only update on change
			this.loadSim(contentBlockId)
		}
    }
	componentWillReceiveProps(nextProps){
		//componentWill update takes next props as argument

        //ctx.fillStyle = 'rgb(255, 0, 0)';
        //ctx.fillRect(10, 10, 50, 50);

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
        this.inputAvailable = true
        let mouseDown = false
		const setMousePos = (e) => {
			const mouseX = e.pageX - e.currentTarget.offsetLeft || 0
            const mouseY = e.pageY - e.currentTarget.offsetTop || 0
            this.prim.clear()
            this.render(this.prim, {mouseX, mouseY})

            this.inputAvailable = true
		}
		const setMouseDown = () => {
			mouseDown = true
            this.inputAvailable = true
		}
		const setMouseUp = () => {
			mouseDown = false
            this.inputAvailable = true
		}
        const functionTable = this.props.functionTable
        const tableVis = this.props.loadState !=='loading' ? Object.keys(functionTable).map((func)=>(
            <pre key={func}>{func}:{functionTable[func].toString()}</pre>
        )): 'loading'
		return (
            <div>
                <canvas
                    id="canvas"
                    width="600"
                    height="600"
                    style={simCardStyle}
                    onMouseMove = {setMousePos}
                >
                </canvas>
                <pre style={{...cardStyle, backgroundColor:"white", position:'absolute', top:300}}>
                    {this.props.loadState !=='loading' ? this.props.renderMonad.toString() : "loading"}

                    {tableVis}
                </pre>
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
        console.time('draw')
		const {renderMonad, functionTable} = compile(state)
        console.timeEnd('draw')
		return {
			renderMonad,
            functionTable,
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
