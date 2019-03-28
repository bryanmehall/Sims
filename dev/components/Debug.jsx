import React from "react"
import { cardStyle } from './styles'
import { getName, formatArg } from '../ducks/object/utils'
import TreeVis from './TreeVis'
import AstVis from './AstVis'

class Debug extends React.Component {
    constructor(props){
        super(props)
        this.state = {offset:{x:0, y:0}, activeNode:{object:{props:{}}}}
    }
	render() {
        const setCenter =  (x,y)=>{this.setState({offset:{x,y}})}
        const setActive = (node) => {
            this.setState({ activeNode: node })
        }
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
        //const activeHash = this.state.active.object.hash
        const functionTable = this.props.functionTable
        //const functionString = functionTable.hasOwnProperty(activeHash) ? functionTable[activeHash].toString() :
            //activeHash === 'apphash' ? this.props.appString :
           // null
        const tableVis = this.props.loadState ==='loading'
            ?''
            :Object.keys(functionTable).map((func) => (

                    `\n\n\n${func}:\n${functionTable[func].toString()}`
              ))
        const codeVis = (
            <pre style={{ ...cardStyle, backgroundColor: "white", position: 'absolute', fontFamily:'courier new', padding:20, top: 347 }}>
                {this.props.loadState ==='loading' ? "loading" : this.props.appString }
                {tableVis}
            </pre>
        )
        if(this.props.debugType === 'tree' || this.props.debugType === 'ast'){
            return (
                <div style={{...cardStyle, backgroundColor:"white", position:'absolute', padding:20, top:347}}>
                    <ObjectData node={this.state.activeNode}></ObjectData>
                    <svg
                        id="treeVis"
                        width={1000}
                        height={600}
                        onMouseDown = {mouseDownHandler}
                        viewBox = {`${offs.x-300} ${offs.y-150} 600 600`}

                        >
                        {
                            this.props.debugType === 'ast' ?
                                <AstVis ast={this.props.ast} objectTable={this.props.objectTable} setActive={setActive}></AstVis>
                                : <TreeVis
                                      ast={this.props.ast}
                                      objectTable={this.props.objectTable}
                                      setActive={setActive}
                                      activeNode={this.state.activeNode}></TreeVis>
                        }

                    </svg>
                </div>
            )
        } else {
            return codeVis
        }

	}
}
const ObjectData = ({ node }) => {
    let objectData = null
    let astData = null
    if (node.hasOwnProperty('object')){
        const name = getName(node.object)
        const hash = node.object.hash
        objectData = <div>{name} : {hash}</div>
    }
    if (typeof node.ast !== 'undefined') {
        //const args = node.ast.args
        const varDefs = node.ast.variableDefs
        astData = <div>
                Args:
                {Object.values(varDefs).map((varDef, i) => (
                    <div key={i}>
                        <pre>{JSON.stringify(varDef.context, null, 2)}</pre>
                    </div>
                ))}
            </div>

    }
    return (
        <div style={{ position: 'absolute' }}>
            {objectData}
            {astData}
        </div>
    )
}

export default Debug
