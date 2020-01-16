import React from 'react'
import { connect } from "react-redux"
import { bindActionCreators } from 'redux';
import { linkStyle } from './styles'
import ContentActions from '../ducks/content/actions'
import {UnmountClosed} from 'react-collapse'
import Link from 'redux-first-router-link'
import Part from './Part'

import { courseIsLoading, getParts, getCourseTitle, getPartTitle, getPartId, getCurrentCourseId, getCourseDescription } from '../ducks/content/selectors'
import SmdApp from "./SmdApp"
import NavBar from './NavBar'

class Course extends React.Component {
	componentDidMount(){
		this.props.fetchCourseData(this.props.courseId)
	}
	render() {
		const course = this
		const parts = this.props.parts //part ids
		const loading = this.props.loading
		const courseId = this.props.courseId
		const activeCourse = this.props.activeCourse
		const expanded = activeCourse === courseId
		const visible = activeCourse === courseId || activeCourse === null
		if (loading){
			return <div>loading</div>
		}

		const createPartList = (partId, index) => {
			return (
					<div key={partId}>
						<Part partId={partId} courseId={courseId} index={index}></Part>
					</div>
			)
		}
		const expandedCourse = (
			<div>
				{parts.map(createPartList)}
			</div>
		)
		const collapsedCourse = (
			<div style={{
					cursor:'pointer',
					padding:40
				}}
				>
				<image></image>
				<div style={{fontSize: 24, color:"#889"}}>
					{this.props.title}
				</div>
				<div style={{fontSize: 18, color:"#889"}}>
					{this.props.courseDescription}
				</div>
			</div>
		)
		const isOpen = expanded || this.props.activeCourse === null
		if (!visible){
			return null
		} else {
			return (
				<div
					onClick = {expanded ? null : ()=>{course.props.activateCourse(this.props.courseId)}}
					>
					<div style ={{color:'#eee'}}>
						{expanded ? null : collapsedCourse}
					</div>
					{ expanded ? expandedCourse : null}
				</div>

		)
		}

	}
}

function mapStateToProps(state, props) {
	const courseId = props.courseId
	const loading = courseIsLoading(state, courseId)
	if (!loading){
		return {
			loading: courseIsLoading(state, courseId),
			parts: getParts(state, courseId),
			title: getCourseTitle(state, courseId),
			courseDescription:getCourseDescription(state, courseId),
			activeCourse: getCurrentCourseId(state)
		}
	} else {
		return {
			loading:true,
			parts:[],
			title:'',
			activeCourse:null
		}
	}

}

function mapDispatchToProps(dispatch) {
	return {
		fetchCourseData: (courseId) => (
			dispatch(ContentActions.fetchCourseData(courseId))
		),
		activateCourse: (courseId) => (
			dispatch(ContentActions.activateCourse(courseId))
		)
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Course)

