import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { InteractiveForceGraph, ForceGraphNode, ForceGraphLink } from 'react-vis-force';
import ObjectActions from '../ducks/object/actions'
import TreeNode from './TreeDiagram'

export default class TreeDiagram extends React.Component {
	constructor(props){
		super(props)
        console.log(props.objectTable)
		this.state = {filters:{object:true, primitive:true}}
	}

	render() {
        const objectTable = this.props.objectTable || {}
        if (Object.keys(objectTable).length === 0 && objectTable.constructor === Object){
            console.log('!!!!!!!!!!!!!!!')
            return <div>loading graph</div>
        }
        console.log('#################')
		const nodes = this.props.nodes.map((node) => {
			const type = node.type
			const color =
				type === 'object' ? 'black' :
				type === 'root' ? 'green' :
				'red'
			return (
				<ForceGraphNode key={node.id} node={{ id: node.id }} fill={color} showLabel></ForceGraphNode>
			)
		})
		//############addFilters
		const links = this.props.links.map((link) => (
			<ForceGraphLink link={{ source: link.source, target: link.target }} />
		))
		const simOptions = {
			height: 500,
			width: 400,
			animate: true,
			strength: {
				x: 0.1,
				charge: -150,
				y: (data) => {
					if (data.id === 'app'){
						return 1
					} else {
						return 0.1
					}

				}
			}
		}
		return (
			<InteractiveForceGraph simulationOptions={simOptions} zoom={true}>
				{nodes}
				{links}
			</InteractiveForceGraph>
		)
	}
}
/*
const mapStateToProps = (state) => {
	let nodes = [{ id: 'app', label: 'app', type: 'root' }]
	let links = []
	let i = 0
	const getAttrs = (objectData) => {
		i+=1
		if (i>100){
			console.log('circular with threshold 20')
			throw new Error('circular with threshold 20')
		}
		const id = objectData.props.id
		const attributeSet = getValue(state, 'placeholder', 'attributes', objectData)
		const attributes = getSetData(state, attributeSet)
		if (attributes === undefined){
			console.log('undefined attrs for '+id)
			return
		}

		attributes.forEach((attrData) => {
			const attr = attrData.props.id
			let valueId = "undef"
			let valueData = {}
			try {
				valueData = getValue(state, 'placeholder', attr, objectData) //replace with get js for name
				//console.log(attr, valueData.props)
				valueId = valueData.props.id
			} catch (e){
				//console.log(`could not find ${attr} of ${id}`)
			}
			const match = nodes.find((nodeData) => (nodeData.id === valueId))

			if (valueId !== 'undef' && attr !== 'attributes'){
				links.push({ source: id, target: valueId, label: attr })
				if (match === undefined){ //if node is not already in nodes array
					nodes.push({ id: valueId, label: valueId, type: 'object' })
					getAttrs(valueData)
				}
			}



		})
	}

	getAttrs(getObject(state, 'app'))
	return {
		nodes,
		links
	}
}

const mapDispatchToProps = (dispatch) => (
	{
		setActiveObject: (id) => {
			dispatch(ObjectActions.setActiveObject(id))
		}
	}
)

export default connect(mapStateToProps, mapDispatchToProps)(TreeDiagram)*/
