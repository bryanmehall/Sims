import React from "react"
import { cardStyle } from './styles'
import { getAttr } from '../ducks/object/objectUtils'
import { formatArg } from '../ducks/object/utils'
import TreeVis from './TreeVis'
import AstVis from './AstVis'
import FlowVis from './FlowVis'

class Debug extends React.Component {
    constructor(props){
        super(props)
        this.state = { offset: { x: 0, y: 0 }, activeNode: { object: {} } }
    }
	render() {
        if (this.props.loadState === 'loading' || this.props.runtime === null){
            return <div>loading</div>
        }
        const { runtime } = this.props
        const setCenter =  (x,y) => { this.setState({ offset: { x, y } }) }
        const setActive = (node) => {
            this.setState({ activeNode: node })
        }
        const offs = this.state.offset
        const mouseDownHandler = (e) => {
            const initialOffset = this.state.offset
            const clickOffset = { x: e.pageX, y: e.pageY }
            const treeVis = document.getElementById('treeVis')
            document.addEventListener('mouseup', () => {
                treeVis.removeEventListener('mousemove', mouseMoveHandler)
            })
            const mouseMoveHandler = (e) => {
                const dx = e.pageX-clickOffset.x
                const dy = e.pageY-clickOffset.y
                setCenter(-dx+initialOffset.x,-dy+initialOffset.y)

            }
            treeVis.addEventListener('mousemove', mouseMoveHandler)
        }
        //const activeHash = this.state.active.object.hash
        const functionTable = runtime.functionTable
        const tableVis = Object.keys(functionTable).map((func) => (
                `\n\n\n${func}:\n${functionTable[func].toString()}`
            ))
        const rootASTs = Object.entries(runtime.outputs)
            .map((entry) => (
                `\n\n\n${entry[0]}:\n${entry[1].value.toString()}`
            ))
        const codeVis = (
            <pre style={{ ...cardStyle, backgroundColor: "white", position: 'absolute', fontFamily: 'courier new', padding: 20, top: 347 }}>
                {rootASTs}
                {tableVis}
            </pre>
        )
        if (this.props.debugType === 'tree' || this.props.debugType === 'ast'){
            return (
                <div style={{ ...cardStyle, backgroundColor: "white", position: 'absolute', padding: 20, top: 347 }}>
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
                                <AstVis ast={runtime.outputs.apphash.ast} objectTable={runtime.hashTable} setActive={setActive}></AstVis>
                                : <TreeVis
                                      ast={runtime.outputs.apphash.ast}
                                      objectTable={runtime.hashTable}
                                      setActive={setActive}
                                      activeNode={this.state.activeNode}></TreeVis>
                        }

                    </svg>
                </div>
            )
        } else if (this.props.debugType === 'flow') {
            return <FlowVis runtime={this.props.runtime}></FlowVis>
        } else {
            return codeVis
        }

	}
}
export const getName = (objectData) => {
    const nameObject = getAttr(objectData, 'name')
    return typeof nameObject === 'undefined' ? 'object' : getAttr(nameObject, 'jsPrimitive').value
}

const ObjectData = ({ node }) => {
    let objectData = null
    let astData = null
    if (node.hasOwnProperty('object')){
        const name = getName(node.object)
        const hash = node.object.hash
        objectData = <div>{name} : {hash}</div>
    }
    if( typeof node.ast !== 'undefined'){
        const varDefs = node.ast.varDefs
        const args = node.ast.args
        astData = <div>
                Args:
                {Object.values(args).map((arg) => (
                    <div>
                        {formatArg(arg)}
                        <pre>{/*JSON.stringify(arg.context, null, 2)*/}</pre>
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
