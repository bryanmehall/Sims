import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { listProps, getActiveObject } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import TreeNode from './TreeDiagram'


class TreeDiagram extends React.Component {
	constructor(props){
		super(props)
	}

	render() {
		return (
			<svg
                style={{width:500, backgroundColor:'#eee'}}
                >

			</svg>
		)
	}
}
const mapStateToProps = (state) => {
	return {
	}
}

const mapDispatchToProps = (dispatch) => (
	{
		setActiveObject: (id) => {
			dispatch(ObjectActions.setActiveObject(id))
		}
	}
)

export default connect(mapStateToProps, mapDispatchToProps)(TreeDiagram)
