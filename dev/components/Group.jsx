import React from 'react'
import Circle from './Circle'

const childTypes = {
	Circle: Circle
}
const createChildren = (childData) => {
	const type = childTypes[childData.type]
	const key = childData.id
	const props = Object.assign(childData, { key })
	return React.createElement(type, props)
}
const Group = ({ children }) => (
	<g>
		{children.map(createChildren)}
	</g>
)
export default Group
