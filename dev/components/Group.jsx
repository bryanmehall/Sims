import React from 'react'
import Circle from './Circle'
import Text from './Text'

class Group extends React.Component {
	constructor(props){
		super(props)
		const childTypes = {
			Circle: Circle,
			Text: Text,
			Group: Group
		}

		this.createChildren = (childData) => {
			const type = childTypes[childData.type]
			const key = childData.id
			const props = Object.assign(childData, { key })
			return React.createElement(type, props)
		}
	}


	render() {
		return (
			<g>
				{this.props.children.map(this.createChildren)}
			</g>
		)
	}
}

export default Group
