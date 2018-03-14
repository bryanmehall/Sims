import React from "react"
import { cardStyle } from './styles'
import Trace from './Trace'
class Debug extends React.Component {
    constructor(props){
        super(props)
        this.state = {offset:{x:0, y:0}}
    }
	render() {
        const setCenter =  (x,y)=>{this.setState({offset:{x,y}})}
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
        return (
            <svg
                id="treeVis"
                width={1000}
                height={600}
                onMouseDown = {mouseDownHandler}
                viewBox = {`${offs.x-300} ${offs.y-150} 600 600`}
                style={{...cardStyle, backgroundColor:"white", position:'absolute', top:310, left:'26%'}}
                >
                <Trace
                    setCenter = {setCenter}
                    trace={this.props.trace}
                    x={550}
                    y={20}
                    ></Trace>
            </svg>
        )
	}
}



export default Debug
