import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getObject } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'

class ObjectSearch extends React.Component {
	constructor(props){
		super(props)
		this.state = { newObject: false }
	}
	render (){
		const self = this
		const changeHandler = (e) => {
			const value = e.target.value
			if (value.startsWith('\\') || value.startsWith('new')){
				self.setState({ newObject: true })
				e.target.value = ''
			}
			const charCode = (typeof e.which == "number") ? e.which : e.keyCode
			if (charCode === 13){ //backslash is keycode 92
				if (self.state.newObject){
					self.props.createInstance(value)
					self.props.setProp(self.props.objectId, self.props.attrId, value+'1')
				} else {
					self.props.setProp(self.props.objectId, self.props.attrId, value)
				}

			}

		}
		return (
			<div>
				{this.state.newObject ? 'new ' : null}
				<input
					size={15}
					onKeyUp={changeHandler}

					alt="search for object by id '\' or 'new' to create new"
					></input>
			</div>
		)
	}
}

const mapStateToProps = (state, props) => ({

})

const mapDispatchToProps = (dispatch) => ({
	setProp: (objectId, attrId, value) => {
		dispatch(ObjectActions.setProp(objectId, attrId, value))
	},
	setActiveObject: (id) => {
		dispatch(ObjectActions.setActiveObject(id))
	},
	createInstance: (type) => {
		dispatch(ObjectActions.addObject(type+'1', type, { jsPrimitive: {type:'number', value:50}}))
	}
})
export default connect(mapStateToProps, mapDispatchToProps)(ObjectSearch)

