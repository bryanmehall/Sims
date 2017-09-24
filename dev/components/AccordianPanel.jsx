import React from 'react'
import { connect } from 'react-redux'
import { Collapse } from 'react-collapse'
import { listProps } from '../ducks/widget/selectors'
import AttributeTab from './AttributeTab'

const AccordianPanel = ({objectId, attrs}) => {
		objectId = "pendulumPlot"
		const attributeTabs = attrs.map((attr) => (<AttributeTab key={attr} objectId={objectId} attrId={attr}/>))
		return (
			<div
				style={{
					width: 800,
					padding: 5,
					backgroundColor: '#ddd'
				}}
				>
				<h3 >{objectId}</h3>
				<div>{attributeTabs}</div>
			</div>
		)
}
const mapStateToProps = (state, props) => {
	let attrs
	try {
		 attrs = listProps(state, "pendulumPlot")
	} catch (e){
		attrs = []
	}
	return {
		attrs:attrs
	}
}

const mapDispatchToProps = (dispatch) => {
	return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(AccordianPanel)
