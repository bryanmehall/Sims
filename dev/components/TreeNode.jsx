import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { listProps, getActiveObject } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'



class TreeNode extends React.Component {
	constructor(props){
		super(props)
	}

	render() {
		return (
			<g>
				<circle></circle>
			</g>
		)
	}
}
const mapStateToProps = (state) => {

	let attrs = []
	return {
		attrs: attrs
	}
}

const mapDispatchToProps = (dispatch) => (
	{
		setActiveObject: (id) => {
			dispatch(ObjectActions.setActiveObject(id))
		}
	}
)

export default connect(mapStateToProps, mapDispatchToProps)(TreeNode)
