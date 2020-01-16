import React from "react"
import ReactDOM from "react-dom"
import { connect } from "react-redux"
import QuantityActions from '../ducks/quantity/actions'
import ObjectActions from '../ducks/object/actions'
import { UpArrow, DownArrow, Anim } from './icons'
import { getActive } from '../ducks/object/selectors'
import { clamp } from '../utils/quantity'
import {
	getValue,
	getQuantityData,
	getHighlighted,
	getIndependent,
	getAnimatable,
	getPlaying,
	getColor,
	getMin,
	getMax
} from '../ducks/quantity/selectors'
import { mathVarStyle, mathTextStyle, displayValue } from './styles'
import ValueOverlay from './ValueOverlay'

/*
mouse down->

*/
class Value extends React.Component {
	constructor(props){
		super(props)
		this.mouseDown = this.mouseDown.bind(this)
		this.dragRelease = this.dragRelease.bind(this)
		this.dragMove = this.dragMove.bind(this)
		this.closeSlider = this.closeSlider.bind(this)
		this.mouseOver = this.mouseOver.bind(this)
		this.mouseOut = this.mouseOut.bind(this)
		this.state = {
			bbox:{x:0, y:0, width:10, height:0}
		}
	}

    componentDidUpdate(){

		const bbox = ReactDOM.findDOMNode(this).getBoundingClientRect()
		//this.setState({bbox:bbox})
		//const prevWidth = this.width || bbox.width
		//this.width = bbox.width
		//const dw = this.width-prevWidth
		//this.props.updateWidth(dw)
    }
	mouseOver(e){
		this.wasHighlighted = this.props.highlighted

		this.props.setHighlight(this.props.quantity,true)
	}
	mouseOut(e){

		if (!this.wasHighlighted&&!this.dragging){
			this.props.setHighlight(this.props.quantity, false)
		}
	}
	mouseDown(e){
		this.mouseDownTime = e.timeStamp
		this.dragging = true
		this.mouseDownPos = {
			x: e.clientX, //careful of these persisting over different clicks
			y: e.clientY
		}
		this.initialValue = this.props.quantityValue
		const range = this.props.max - this.props.min
		const frac = (this.initialValue - this.props.min)/range
		const sliderHeight = 150

		this.sliderTop = - sliderHeight*(1-frac)
		console.log(this.sliderTop, frac)
		document.addEventListener('mouseup', this.dragRelease)
		document.addEventListener('mousemove', this.dragMove)
		this.props.setActive(this.props.id, true)
	}
	dragMove(e){//on drag move
		e.preventDefault()
		const dy = e.clientY-this.mouseDownPos.y
		const range = this.props.max - this.props.min
		const newValue = this.initialValue-dy/150*range

		this.props.setValue(this.props.quantity, clamp(newValue, this.props.min, this.props.max))

	}
	closeSlider(e){//mouse move handler for closing slider

	}
	dragRelease(e){
		document.removeEventListener('mousemove', this.dragMove)
		document.addEventListener('mousemove', this.closeSlider)
		this.props.setHighlight(this.props.quantity, false)
		this.props.setActive(this.props.id, false)
		this.dragging = false

		const releaseTime = e.timeStamp
		const releasePos = {
			x: e.clientX,
			y: e.clientY
		}

		const wasDragged = releaseTime-this.mouseDownTime > 500 ||
			  releasePos.y-this.mouseDownPos.y > 20
		if (!wasDragged){
			//undo changes from dragging and open text input
		}
	}

	render(){
		var self = this
        var quantity = this.props.quantity
		var bbox = this.props.bbox || {width:0, height:0}
        var independent = this.props.independent
		const active = this.props.active
        const highlighted = this.props.highlighted
        const value = this.props.quantityValue
		var filter = highlighted ? "url(#highlight)" : null//seei f this works with css filters

		const style =  mathVarStyle
		/*const independentControls = (

			<DownArrow pos={{ x: bbox.width/2, y: 0 }} active={false}></DownArrow>
			this.props.highlighted ? hoverAnimButton : null
		)*/
		//parse symbol from string
		let symbol
		const underscoreIndex = this.props.symbol.indexOf("_")
		if (underscoreIndex === -1){
			symbol = this.props.symbol
		} else {
			const text = this.props.symbol.substring(0, underscoreIndex)
			const sub = this.props.symbol.substring(underscoreIndex+1)
			symbol = text
			symbol = <span>{text}<sub style={{fontStyle:'normal', fontSize:"62%"} }>{sub}</sub></span>
		}
		const anim = (
			<div style={{ margin: "0 auto",
						}}><Anim state={"playing"}></Anim></div>
		)
		const overlay = (
			<div
				style={{
					position: 'absolute',
					left: '50%',
					display:'flex',
					flexWrap: 'wrap',
					//backgroundColor:'gray',
					justifyContent: 'center',
					transform: 'translate(-50%, 0%)'
				}}
				>
				<div style={{ position: "absolute",top:-45}}>
					{(independent ) ?  <UpArrow active={false}></UpArrow>: null}
				</div>
				<div style={{ position: "absolute"}}>
					{(independent ) ?  <DownArrow active={false}></DownArrow>: null}
				</div>
				<div style={{
						paddingTop:20,
							//backgroundColor:'blue'
					}}>
					{highlighted ? (<div>{symbol}=<span style={{...mathTextStyle, fontSize:"100%", fontStyle:'normal'}}>{displayValue(value)}</span></div>) : null}
				</div>
				<div>
					{/*(!this.dragging&&independent&&highlighted)? anim : null*/}
				</div>

			</div>
		)
        //const precision = this.props.precision || Math.min(3,Math.max(Math.log10(Math.abs(value)+2),1))
        //if (quantity = 't') {console.log('t',Math.log10(Math.abs(value)+2))}
        //because the default toPrecision function is just bad
        //converts scientific notation while keeping trailing zeroes
		//<tspan dx={3}>F<tspan fontSize="0.5em" baselineShift="sub">s</tspan></tspan>
		return (
                <div
                    style={{
						...style,
						display:"inline",
						position:'relative',
						//backgroundColor:'green',
						paddingBottom:50,
						//repeat shadows to make thicker because css is a giant hack
						textShadow: highlighted ? `-1px -1px 4px ${this.props.color},  1px 1px 4px ${this.props.color}` : null,
						cursor: independent? 'ns-resize': 'default'
					}}
					onMouseOver={this.mouseOver}
					onMouseOut={this.mouseOut}
					onMouseDown={this.mouseDown}
                >
					{overlay}
					{symbol}
			</div>
		)
    }
}

function mapStateToProps(state, props) {

	var quantityData = getQuantityData(state, props.quantity)
	return {
		symbol: quantityData.symbol,
		independent: getIndependent(state, props.quantity),
		min: getMin(state, props.quantity),
		max: getMax(state, props.quantity),
		active: props.active !== undefined ? props.active : getActive(state, props.id),
		highlighted: getHighlighted(state, props.quantity),
		quantityValue: getValue(state, props.quantity),
		color: getColor(state, props.quantity),
		playing: getPlaying(state, props.quantity)
        //add precision as state
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
		setValue:(name, value) => {
			dispatch(QuantityActions.setValue(name, value))
		},
		setPlay:(name, value) => {
			dispatch(QuantityActions.setPlay(name, value))
		}
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Value);
