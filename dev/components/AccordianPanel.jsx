import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { listProps, getActiveObject } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import AttributeTab from './AttributeTab'
import TreeDiagram from './TreeDiagram'

class AccordianPanel extends React.Component {
	constructor(props){
		super(props)
		this.state = { history: [props.objectId] }
	}
	componentWillReceiveProps(nextProps){
		const newId = nextProps.objectId
		const currentId = this.props.objectId
		const currentHistory = this.state.history
		const newIndex = currentHistory.indexOf(newId)
		if (newId !== currentId){
			if (newIndex === -1){ //if going outward in the tree
				const newHistory = [...currentHistory, newId]
				this.setState({ history: newHistory })
			} else { //if going back up the tree
				const newHistory = currentHistory.slice(0,newIndex+1)
				this.setState({ history: newHistory })
			}

		}

	}
	render() {
		const { objectId, attrs } = this.props
		const navActive = (e) => { this.props.setActiveObject(e.target.id) }
		const attributeTabs = attrs.map((attr) => (<AttributeTab key={attr} objectId={objectId} attrId={attr}/>))
		const historyTabs = this.state.history.map((id) => (
			<span
				onClick={navActive}
				id={id}
				style={{ cursor: 'pointer' }}
				key={id}
				> > {id}</span>

		))
		return (
			<div
				style={{
					padding: 5,
					backgroundColor: '#ddd',
					maxHeight: 800,
					overflowY: 'auto',
					display: 'flex'
				}}
				>
				<div>
					{historyTabs}
					<h3 >{objectId}</h3>
					<div>{attributeTabs}</div>
				</div>
				<TreeDiagram></TreeDiagram>
			</div>
		)
	}
}
const mapStateToProps = (state) => {
	const activeObject = getActiveObject(state)
	let attrs = []
	try {
		attrs = listProps(state, activeObject)
	} catch (e){
		attrs = []
	}
	return {
		objectId: activeObject,
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

export default connect(mapStateToProps, mapDispatchToProps)(AccordianPanel)
