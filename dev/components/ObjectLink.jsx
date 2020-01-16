import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getValue, getJSValue, objectLib } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import ObjectSearch from './ObjectSearch'

const UnconnectedObjectLink = ({ parentData, attrId, objectData, objectId, setActiveObject, setProp, magicPlaceholder, prevVal, updateObject, displayText, createSearchObject }) => {
	//magic placeholder simulates searching to get object
	if (objectData.type === 'search'){
		return <ObjectSearch objectId={objectId} attrId={attrId}></ObjectSearch>
	}
	const linkStyle = {
		cursor: 'pointer',
		border: '1px solid #888',
		borderRadius: 4,
		backgroundColor: magicPlaceholder ? "#ecc" : '#ccc'
	}
	let items = ''
	if (objectData.type === 'set'){
        items = (
            <div
                style={{ backgroundColor: '#ccc', padding: 2, cursor: 'pointer' }}
                key = "add button"
                onClick={() => {
					const value = prevVal.type === 'undef' ? objectData : prevVal
					const newSet = objectLib.union(value, objectLib.undef, objectData)

					console.log(value, newSet)
					setProp(parentData.props.id, attrId, newSet)
                }}
                >
                +
            </div>
        )
	}
	return (
		<div>
			<div
				onClick={() => { setActiveObject(objectData) }}
				style={linkStyle}
			>
				{displayText}
			</div>
			<div>
				{items}
			</div>
		</div>
	)
}
const mapStateToProps = (state, props) => {
	const objectData = props.objectData
	if (props.attrId === 'id'){
		//console.log(objectData, props.attrId)
		return {
			prevVal:objectLib.undef,
			displayText: JSON.stringify(objectData),
			objectData: objectLib.undef,
			objectId: objectData
		}
	} else {
		const prevVal = getValue(state, 'prevVal', objectData)
		const id = objectData.props.id
		const displayText = props.magicPlaceholder ? `search(${id})` :
							props.attrId === 'prevVal' ? <pre>{JSON.stringify(objectData, null, 2)}</pre>:
							id
		const objectId = objectData.props.id
		return {
			prevVal,
			displayText,
			objectData,
			objectId
		}
	}
}

const mapDispatchToProps = (dispatch) => ({
	setProp: (objectId, attrId, value) => {
		dispatch(ObjectActions.setProp(objectId, attrId, value))
	},
    updateObject: (id, objectData, parentId, attrId) => {
        const split = id.split("_")
        const idVersion = parseInt(split[1], 10) || 0

        const baseId = split[0]//update version should be an action along with create instance
        const newId = baseId+'_'+(idVersion+1)
        const props = Object.assign(objectData.props, { previousValue: id })
        dispatch(ObjectActions.addObject(newId, objectData.type, props))
        dispatch(ObjectActions.setProp(parentId, attrId, newId))
        return newId
    },
	createSearchObject: () => {
		dispatch(ObjectActions.addObject('search1', 'search', {lynxIR:{type:'search'}}))
	},
	setActiveObject: (objectData) => {
		dispatch(ObjectActions.setActiveObject(objectData))
	}
})
const ObjectLink = connect(mapStateToProps, mapDispatchToProps)(UnconnectedObjectLink)
export default ObjectLink
