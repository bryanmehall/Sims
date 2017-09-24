import React from 'react'
import Link  from 'redux-first-router-link'
import { connect } from 'react-redux'
import { linkStyle } from './styles'
import {Collapse} from 'react-collapse'

import { getCurrentCourseId } from '../ducks/content/selectors'
import Course from "./Course"



const Courses = ({ activeCourse }) => {
		return  (
			<div>
				<Course courseId="about-zibit"/>
				<Course courseId="mechanics" />
				<Course courseId="controlsystems" />
				{/*<Course courseId="calculus" />*/}
			</div>
		)
}
const mapStateToProps = (state, props) => {
	return {
		activeCourse: getCurrentCourseId(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(Courses)
