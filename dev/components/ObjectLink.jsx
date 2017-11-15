import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getObject, getValue, getJSValue } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'
import ObjectSearch from './ObjectSearch'

const UnconnectedObjectLink = ({ parentId, attrId, objectData, setActiveObject, setProp, magicPlaceholder, elements, updateObject, displayText, createSearchObject }) => {
	//magic placeholder simulates searching to get object
	const objectId = objectData.props.id
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
		items = elements.map(
			(element) => (
				<ObjectLink key={element.props.id} objectId={element.props.id} attrId={attrId} parentId={parentId}></ObjectLink>
			)
		)
        items.push(
            <div
                style={{ backgroundColor: '#ccc', padding: 2, cursor: 'pointer' }}
                key = "add button"
                onClick={() => {
					console.log(elements, objectData.props)
					createSearchObject()

					const newPrimitive = {type:'set', id:objectId, elements:elements.concat('search1')}
					console.log('adding primitive', newPrimitive)
					setProp(objectId, 'jsPrimitive', newPrimitive)
                    //const newId = updateObject(objectId, objectData, parentId, attrId)

                }}
                >
                +
            </div>
        )
	}
	return (
		<div>
			<div
				onClick={() => { setActiveObject(objectId) }}
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
	const value = getValue(state, props.parentId, props.attrId) //replace eval: modify here
    const objectData = getObject(state, value)
	const id = objectData.props.id
	const displayText = props.magicPlaceholder ? `search(${id})` : id

    /*if (objectData.type === 'set'){
		const els = getVal(ue(state, props.objectId, 'jsPrimitive')
        const elements = els || []
		console.log(elements)
		const elementData = elements.map((element) => (getObject(state, element)))
        return {
            elements:elementData,
			displayText,
            objectData
        }
    } else {*/
        return {
            elements: [],
			displayText,
            objectData
        }
   // }

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
		dispatch(ObjectActions.addObject('search1', 'search', {jsPrimitive:{type:'search'}}))
	},
	setActiveObject: (id) => {
		dispatch(ObjectActions.setActiveObject(id))
	}
})
const ObjectLink = connect(mapStateToProps, mapDispatchToProps)(UnconnectedObjectLink)
export default ObjectLink
