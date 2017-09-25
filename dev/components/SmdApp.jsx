import React, { PropTypes } from "react"
import { connect } from "react-redux"
import { bindActionCreators } from 'redux'
import * as QuantityActions from '../ducks/quantity/actions'
import { getValue } from '../ducks/quantity/selectors'
import { getChildren } from '../ducks/object/selectors'
import { getContentBlocks } from '../ducks/content/selectors'
import { Link } from 'react-router-dom'
import { Route, Switch, Redirect } from 'react-router'
import Slider from './Slider'
import TitleBar from './TitleBar'
import Plot from './Plot'
import Abstraction from './Abstraction'
import Expression from './Expression'
import Value from './Value'
import InfoBar from './InfoBar'
import NavBar from './NavBar'
import ContentBlock from "./ContentBlock"

import Sim from './Sim'
import { cardStyle, linkStyle, headerStyle } from './styles'


class SmdApp extends React.Component {
	constructor(props) {
		super(props);
		this.state = { width: '0', height: '0' };
		this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
	}

	componentDidMount() {
	  	this.updateWindowDimensions();
	  	window.addEventListener('resize', this.updateWindowDimensions);
	}

	componentWillUnmount() {
	  	window.removeEventListener('resize', this.updateWindowDimensions);
	}

	updateWindowDimensions() {
	  	this.setState({ width: window.innerWidth, height: window.innerHeight });
	}

	render(){
		const { actions } = this.props;
		const partId = this.props.match.params.partId
		const loading = this.props.loading
		const sideBarWidth = 0.25*this.state.width
		const margin = cardStyle.margin
		const navPath = []

		const createContentBlocks = (contentData) => (
			<Link
				key={contentData.id}
				style={linkStyle}
				to={`${this.props.match.url}/${contentData.id}`}
				>
				<Switch>
					<Route
					exact path={`${this.props.match.url}/${contentData.id}`}
					render={()=>(
						<ContentBlock
						active={true}
						partId={partId}
						width={sideBarWidth-margin*2}
						{...contentData}
						/>
					)}
					/>
					<Route
						path={`${this.props.match.url}`}
						render={()=>(
							<ContentBlock
							active={false}
							partId={partId}
							width={sideBarWidth-margin*2}
							{...contentData}
							/>
						)}
					/>
				</Switch>
			</Link>
		)
		if (loading){
			return (<div>Loading</div>)
		} else {
			const contentBlocks = this.props.contentBlocks.map(createContentBlocks)
			return (
				<div style={{ display: 'relative' }}>
					<div style={{
							overflow: "hidden",
							width: sideBarWidth - cardStyle.margin,
							fontFamily: '"Roboto", sans-serif',
							fontWeight: "500",
							fontSize: 15,
							margin: 5,
							position: 'absolute',
						}}>
						<div style={headerStyle}>
							<div >Part 01: Simple Harmonic Oscillator</div>
						</div>
						{contentBlocks}
					</div>
					<Route
						exact path={`${this.props.match.url}/:contentId`}
						render = {
							(props) => {
								return <Sim width={1200}{...props} height={600} pos={{ x: sideBarWidth+cardStyle.margin, y: 100 }}/>
							}
						}
					/>
				</div>
			)
		}

	}
}


function mapStateToProps(state, props) {
	if (props.loading){
		return {}
	} else {
		return {
			contentBlocks: getContentBlocks(state, props.match.params.partId)
		}
	}

}

function mapDispatchToProps(dispatch) {
	return {
		actions: bindActionCreators(QuantityActions, dispatch)
	};
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SmdApp);
