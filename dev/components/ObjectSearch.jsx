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
					const randInt = Math.floor(Math.random()*1000000).toString(16) //do not use for more than proof of concept
					const id = `${value}_${randInt}`
					self.props.createInstance(value, id)
					self.props.setProp(self.props.objectId, self.props.attrId, `search(${value})`)
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
					placeholder={this.props.objectId}
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
	createInstance: (searchQuerry, id) => {
		dispatch(ObjectActions.createInstance(searchQuerry, id))
		dispatch(ObjectActions.addObject(`search(${searchQuerry})`, "search", { jsPrimitive: { type: 'search', querry: searchQuerry, id: id } }))
		dispatch(ObjectActions.addObject(id, searchQuerry, {}))
        dispatch(ObjectActions.setProp(id, 'instanceOf', searchQuerry))
        dispatch(ObjectActions.setProp(id, 'attributes', 'findParent'))
	}
})
export default connect(mapStateToProps, mapDispatchToProps)(ObjectSearch)

