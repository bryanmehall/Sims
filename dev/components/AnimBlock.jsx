import React from "react";
import { connect } from "react-redux"
import AnimSlider from "./AnimSlider"
import { audio } from '../anim'
import { cardStyle } from './styles'
import { Anim } from './icons'
import ContentActions from '../ducks/content/actions'
import { getAnimPlaying, getAnimLength, getAnimTime } from '../ducks/content/selectors'

class AnimBlock extends React.Component {
	constructor(props){
		super(props)
		const self = this
		this.onDragStart = this.onDragStart.bind(this)
		this.onDragMove = this.onDragMove.bind(this)
		this.onDragEnd = this.onDragEnd.bind(this)
		const { courseId, partId, contentBlockId } = this.props

		this.hasAudio = this.props.length === undefined
		if (this.hasAudio){
			const audioUrl = `/content/courses/${courseId}/${partId}/${contentBlockId}.mp3`
			this.audio = new Audio(audioUrl)
			this.audio.addEventListener('error', () => {
					throw new Error(`audio failed to load or length missing at ${audioUrl}`)
			})
			this.audio.addEventListener('loadedmetadata', () => {
				//set audio to correct time when sim is reloaded
				self.audio.currentTime = this.props.time
				//read audio length property and put in store
				self.props.setAnimLength(courseId, partId, contentBlockId, this.audio.duration)
			})
		}
	}
	componentWillUpdate(nextProps){
		const playStateChanged = this.props.playing !== nextProps.playing
		if (playStateChanged && this.hasAudio){
			if (nextProps.playing === true){
				this.audio.play()
			} else {
				this.audio.pause()
			}
		}
	}
    onDragStart(fractionStart){
		this.isPlaying = this.props.playing
		const { courseId, partId, contentBlockId } = this.props
		this.props.setPlaying(courseId, partId, contentBlockId, false)
	}
	onDragMove(fractionDone){
		const time = this.props.length*fractionDone
		const { courseId, partId, contentBlockId } = this.props
		if (this.hasAudio){
			this.audio.currentTime = time
		}
		this.props.setAnimTime(courseId, partId, contentBlockId, time)
	}
	onDragEnd() {
		const { courseId, partId, contentBlockId } = this.props
		this.props.setPlaying(courseId, partId, contentBlockId, this.isPlaying)
	}
    render(){
		const width = this.props.width || 100
		const height = this.props.height || 30
		const { courseId, partId, contentBlockId, playing, time, length } = this.props
		const titleFontSize = 15
		const color = '#eee'
		const textStyle = {
			fontSize: titleFontSize,
			textAnchor: "middle",
			x: (width+50)/2,
			fill: color,

		}
		const sideBarStyle = {
			width: '25%',
			fontFamily: "helvetica",
			fontSize: 15
		}
		const slider = (
			<AnimSlider
				width={width-10}
				fracDone={time/length}
				onDragStart={this.onDragStart}
				onDragEnd={this.onDragEnd}
				onDragMove={this.onDragMove}
				/>
		)
        return (
            <div>
				<div style={{ display: "flex" }}>
					<div style={{ flexGrow: 1, width: 50 }}>
						<Anim
							onClick={() => {
								this.props.setPlaying(courseId, partId, contentBlockId, !playing)}}
							state={playing ? "playing":"paused"}></Anim>
					</div>

					<div style={{ flexGrow: 2, padding:10 }}>
						{ this.props.active ? this.props.text : this.props.title }

					</div>
				</div>
				<div>
					{ this.props.active ? slider : null}
				</div>
			</div>
        )
    }
}

function mapStateToProps(state, props) {
	const cId = props.courseId
	const pId = props.partId
	const cbId = props.contentBlockId
	return {
		playing: getAnimPlaying(state, cId, pId, cbId),
		length: getAnimLength(state, cId, pId, cbId),
		time: getAnimTime(state, cId, pId, cbId)
	}
}

function mapDispatchToProps(dispatch) {
	//console.log(ContentActions.default.setPlaying)
	//console.log(ContentActions.setPlaying)
	return {
		setPlaying: (courseId, partId, blockId, value) => {
			dispatch(ContentActions.setPlaying(courseId, partId, blockId, value))
		},
		setAnimLength:(courseId, partId, blockId, length) => {
			dispatch(ContentActions.setAnimLength(courseId, partId, blockId, length))
		},
		setAnimTime: (courseId, partId, blockId, time) => {
			dispatch(ContentActions.setAnimTime(courseId, partId, blockId, time))
		}
	}
}


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AnimBlock);
