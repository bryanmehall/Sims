import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getLoadState } from '../ducks/sim/selectors'
import { getJSValue, getValue, getObject, getSetData } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import AttributeTab from './AttributeTab'
import TreeDiagram from './TreeDiagram'

class AccordianPanel extends React.Component {
	constructor(props){
		super(props)
		this.state = { history: [] }
	}
	componentWillReceiveProps(nextProps){
		const newId = nextProps.objectData.props.id
		const currentId = this.props.objectData.props.id
		const currentHistory = this.state.history
		const newIndex = currentHistory.indexOf(newId)
		if (newId !== currentId){
			if (newIndex === -1){ //if going outward in the tree
				const newHistory = [...currentHistory, nextProps.objectData]
				this.setState({ history: newHistory })
			} else { //if going back up the tree
				const newHistory = currentHistory.slice(0,newIndex+1)
				this.setState({ history: newHistory })
			}

		}

	}
	render() {
		if (this.props.notLoaded){//prevent accordian panel and tree from erroring
			return <div>loading</div>
		}
		const { objectData, attrs } = this.props
		const navActive = (e) => { this.props.setActiveObject(e.target.objectData) }
		const attributeTabs = attrs.map((attr) => (<AttributeTab key={attr.props.id} objectData={objectData} attr={attr}/>))
		const historyTabs = this.state.history.map((historyObjectData) => (
			<span
				onClick={navActive}
				id={historyObjectData.props.id}
				objectData={historyObjectData}
				style={{ cursor: 'pointer' }}
				key={historyObjectData.props.id}
				> > {historyObjectData.props.id}</span>

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
					<h3 >{objectData.props.id}</h3>
					<div>{attributeTabs}</div>
				</div>
				{/*<TreeDiagram></TreeDiagram>*/}
			</div>
		)
	}
}
const mapStateToProps = (state) => {
	const loadState = getLoadState(state)
	if (loadState === 'loading'){
		return { objectData:{type:'undef', props:{id:'undef'}}, attrs:[], notLoaded:true }
	}
	const appData = getObject(state, 'app')
	const activeObjectData = getValue(state, 'placeholder', 'activeObject', appData)
	//const prevActiveObject = getValue(state, 'someId', 'prevVal', getValue(state, 'app', 'activeObject'))
	//console.log('##########', prevActiveObject)
	const activeObject = activeObjectData.props.id
	if (activeObject === 'undef'){
		return { objectId: activeObject, attrs: [], notLoaded: true }
	}
	const attrsSet = getValue(state, 'placeholder', 'attributes', activeObjectData)
	const attrs = getSetData(state, attrsSet)
	return {
		objectData: activeObjectData,
		attrs: attrs
	}
}

const mapDispatchToProps = (dispatch) => (
	{
		setActiveObject: (objectData) => {
			dispatch(ObjectActions.setActiveObject(objectData))
		}
	}
)

export default connect(mapStateToProps, mapDispatchToProps)(AccordianPanel)
