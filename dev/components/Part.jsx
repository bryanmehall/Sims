import React from 'react'
import { connect } from "react-redux"
import ContentActions from '../ducks/content/actions'
import Link from 'redux-first-router-link'
import ContentBlock from './ContentBlock'
import { cardStyle, linkStyle, headerStyle } from './styles'
import AccordianPanel from './AccordianPanel'

import {
	getContentBlocks,
	getPartTitle,
	getContentBlockTitle,
	getPartId,
	getCurrentCourseId,
	getCurrentPartId,
	getCurrentContentBlockId,
	getPartIdByIndex
} from '../ducks/content/selectors'

import Sim from './Sim'

class Part extends React.Component {
	constructor(props) {
		super(props);
		this.state = { width: '0', height: '0', editMode:false };
		this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
	}

	componentDidMount() {
	  	this.updateWindowDimensions();
	  	window.addEventListener('resize', this.updateWindowDimensions);
	}

	componentWillUnmount() {
	  	window.removeEventListener('resize', this.updateWindowDimensions);
	}

	updateWindowDimensions() {
	  	this.setState({ width: window.innerWidth, height: window.innerHeight });
	}

	render() {
		const part = this
		const contentBlocks = this.props.contentBlocks //contentBlock ids
		const courseId = this.props.courseId
		const partId = this.props.partId
		const {activeCourse, activePart} = this.props
		const isActive = this.props.activeContentBlock !== null
		const sideBarWidth = 0.25*this.state.width
		const margin = cardStyle.margin
		const expanded =  this.props.activeCourse === courseId
		const visible = (activeCourse === courseId && activePart === partId) || activePart === null
		const createContentBlockList = (contentBlockId, index) => {
			return (
					<div key={contentBlockId}>
						<ContentBlock
							courseId={courseId}
							partId={partId}
							contentBlockId={contentBlockId}
							width={sideBarWidth-margin*2}
							></ContentBlock>
					</div>
			)
		}
		const prevUrl = `/courses/${courseId}/${this.props.prevPartId}`
		const prevLink = (
			<Link to={prevUrl}>
				<div>
					Previous Part: {this.props.previousPartTitle}
				</div>
			</Link>
		)
		const previousPartLink = this.props.hasPrevPart ? prevLink : null
		const nextUrl = `/courses/${courseId}/${this.props.nextPartId}`
		const nextLink = (
			<Link to={nextUrl}>
				<div>
					Next Part: {this.props.nextPartTitle}
				</div>
			</Link>
		)
		const nextPartLink = this.props.hasNextPart ? nextLink : null
		const contentBlockBar = (

			<div style={{
					overflow: "hidden",
					width: sideBarWidth - cardStyle.margin,
					fontFamily: '"Roboto", sans-serif',
					fontWeight: "500",
					//backgroundColor:'gray',
					fontSize: 15,
					margin: 5,

				}}>

				<div style={headerStyle}>
					{this.props.title}
				</div>
				{ isActive ? previousPartLink : null }
				{ contentBlocks.map(createContentBlockList) }
				{ isActive ? nextPartLink : null}
			</div>
		)
		const toggleEditMode = () => {
			this.setState({editMode:!this.state.editMode}) //this.props.setEditMode(true)
		}
		const editIcon = (
			<svg
				style={{ position:'absolute',  right:0, bottom:0}}
				cursor="pointer"
				width="40"
				height="40"
				onClick={toggleEditMode}
				>
				<circle cx="20" cy="20" r="15" fill="#444"></circle>
			</svg>
		)
		const imageUrl = `/content/courses/${courseId}/${partId}/thumbnail.png`
		if (!visible) {
			return null
		} else {
			return (
			<div style={{margin:12}}>

				<div style = {{
							display:"flex",
							//backgroundColor:'#ccf',
							border:'black'}}>

					{contentBlockBar}
					{!isActive ?(
						<Link style={{ width:400, height:300, backgroundColor:"white", }}to={`/courses/${courseId}/${partId}/${contentBlocks[0]}`}>
							<img style={{maxWidth:'100%', maxHeight:'100%', margin:'0 auto', draggable:"false" }} src={imageUrl}></img>
						</Link>
					):(
						<div style={{maxWidth:'75%'}}>
								<Sim
								width={400}
								height={300}
								pos={{ x: sideBarWidth+cardStyle.margin, y: 0 }}
								courseId={courseId}
								partId={partId}
								contentBlockId={this.props.activeContentBlock}
								/>

						</div>
					)}
					{isActive && this.state.editMode ? <AccordianPanel></AccordianPanel> : null}
					{editIcon}
				</div>

			</div>
		)
		}

	}
}

function mapStateToProps(state, props) {
	const courseId = props.courseId
	const partId = props.partId
	const index = props.index
	const prevPartId = getPartIdByIndex(state, courseId, index-1)
	const hasPrevPart = prevPartId !== undefined
	const nextPartId = getPartIdByIndex(state, courseId, index+1)
	const hasNextPart = nextPartId !== undefined
	return {
		contentBlocks: getContentBlocks(state, courseId, partId),
		title: getPartTitle(state, courseId, partId),
		activeCourse: getCurrentCourseId(state),
		activePart: getCurrentPartId(state),
		activeContentBlock: getCurrentContentBlockId(state),
		hasPrevPart,
		prevPartId,
		previousPartTitle: hasPrevPart ? getPartTitle(state, courseId, prevPartId) : null,
		hasNextPart,
		nextPartId,
		nextPartTitle: hasNextPart ? getPartTitle(state, courseId, nextPartId) : null,
		//editMode: true
	}
}

function mapDispatchToProps(dispatch) {
	return {
		activatePart: (courseId, partId) => (
			dispatch(ContentActions.activatePart(courseId, partId))
		),
		/*setEditMode: (inEditMode) => {
			dispatch(ContentActions.setEditMode(inEditMode))
		}*/
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Part)

