import React from 'react'
import { connect } from 'react-redux'
//import { Collapse } from 'react-collapse'
import { getObject, getValue } from '../ducks/object/selectors'
import ObjectActions from '../ducks/object/actions'

const UnconnectedObjectLink = ({ objectId, objectData, setActiveObject, magicPlaceholder, elements }) => {
	//magic placeholder simulates searching to get object
	const linkStyle = {
		cursor: 'pointer',
		border: '1px solid #888',
		borderRadius: 4,
		backgroundColor: magicPlaceholder ? '#cce' : '#ccc'
	}
	let items = ''
	if (objectData.type === 'set'){
		items = elements.map(
			(element) => (
				<ObjectLink key={element} objectId={element}></ObjectLink>
			)
		)
        items.push(
            <div
                style={{ backgroundColor: '#ccc', padding: 2, cursor: 'pointer' }}
                key = "add button"
                onClick={() => {}}
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
				{magicPlaceholder ? `search(${objectId})` : objectId}
			</div>
			<div>
				{items}
			</div>
		</div>
	)
}
const mapStateToProps = (state, props) => {
    const objectData = getObject(state, props.objectId)
    if (objectData.type === 'set'){
        const elements = getValue(state, props.objectId, 'jsPrimitive')
        return {
            elements,
            objectData
        }
    } else {
        return {
            elements: [],
            objectData
        }
    }

}

const mapDispatchToProps = (dispatch) => ({
	setProp: (objectId, attrId, value) => {
		dispatch(ObjectActions.setProp(objectId, attrId, value))
	},
	setActiveObject: (id) => {
		dispatch(ObjectActions.setActiveObject(id))
	}
})
const ObjectLink = connect(mapStateToProps, mapDispatchToProps)(UnconnectedObjectLink)
export default ObjectLink
