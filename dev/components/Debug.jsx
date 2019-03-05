import React from "react"
import { cardStyle } from './styles'
import Trace from './Trace'
import TreeVis from './TreeVis'

class Debug extends React.Component {
    constructor(props){
        super(props)
        this.state = {offset:{x:0, y:0}, active:{}}
    }
	render() {
        const setCenter =  (x,y)=>{this.setState({offset:{x,y}})}
        const setActive = (ast) => { this.setState({ active: ast }) }
        const offs = this.state.offset
        const mouseDownHandler = (e) => {
            const initialOffset = this.state.offset
            const clickOffset = {x:e.pageX, y:e.pageY}
            const treeVis = document.getElementById('treeVis')
            document.addEventListener('mouseup',(e)=>{
                treeVis.removeEventListener('mousemove', mouseMoveHandler)
            })
            const mouseMoveHandler = (e) => {
                const dx = e.pageX-clickOffset.x
                const dy = e.pageY-clickOffset.y
                setCenter(-dx+initialOffset.x,-dy+initialOffset.y)

            }
            treeVis.addEventListener('mousemove',mouseMoveHandler )
        }
        const activeHash = this.state.active.hash
        const functionTable = this.props.functionTable
        const functionString = functionTable.hasOwnProperty(activeHash) ? functionTable[activeHash].toString() :
            activeHash === 'apphash' ? this.props.appString :
            null
        const functionDisplay = (
            <pre style={{position:'absolute', backgroundColor:"white"}}>
                {activeHash}:{functionString}
            </pre>
        )


        return (
            <div style={{...cardStyle, backgroundColor:"white", position:'absolute', top:310, left:'26%'}}>
                {functionDisplay}
                <svg
                    id="treeVis"
                    width={1000}
                    height={600}
                    onMouseDown = {mouseDownHandler}
                    viewBox = {`${offs.x-300} ${offs.y-150} 600 600`}

                    >
                    <TreeVis ast={this.props.ast} objectTable={this.props.objectTable} setActive={setActive}></TreeVis>
                    {/*<Trace
                        setCenter = {setCenter}
                        setActive = {setActive}
                        ast={this.props.ast}
                        x={0}
                        y={20}
                        ></Trace>*/}
                </svg>
            </div>

        )
	}
}


export default Debug
