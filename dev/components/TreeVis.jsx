import React from "react"
import * as d3 from "d3"
import { formatArg } from '../ducks/object/utils'
import { objectFromName, getPrimitiveType, getValue, getValueAndContext } from '../ducks/object/objectUtils'
import { getHash } from '../ducks/object/hashUtils'
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE, INTERMEDIATE_REP } from '../ducks/object/constants'
import { Node, Link } from './TreeNode'

class TreeVis extends React.Component {
    constructor(props){
        super(props)
        const appObject = objectFromName(this.props.objectTable, 'app')
        const { nodes, links } = bfsObjectTree(this.props.objectTable, appObject)
        this.state = { nodes, links, allNodes: nodes, allLinks: links }
        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links)
                .id((d) => (d.hash))
                .strength(0)
                )
            .force("forceY", d3.forceY()
                .strength(3)
                .y((d) => (d.level*60)
                )
            )
    }
    componentDidMount(){
        const vis = this
        const orderingForce = () => {
            for (var i = 0; i < vis.state.allNodes.length; i++) {
                const currNode = vis.state.allNodes[i]
                let prevIndex = i-1
                for (var p = prevIndex; p>0; p--){
                    if (vis.state.allNodes[p].level === currNode.level){
                        prevIndex = p
                        break;
                    }
                }
                const prevNode = i === 0 ? { level: -1, x: 0 } : vis.state.allNodes[prevIndex]
                if (currNode.level === prevNode.level){
                    if (currNode.x < prevNode.x+150){
                        const acc = (150-(currNode.x-prevNode.x))
                        currNode.vx += acc
                        prevNode.vx -= acc
                    }
                }
                const parNode = vis.state.allNodes[currNode.parId] || { level: -1, x: 0 }
                const x = parNode === undefined ? 0 : parNode.x
                const diff = (x-currNode.x)
                const acc = Math.sign(diff)*Math.min(1, Math.abs(diff))
                parNode.vx -= acc*2
                currNode.vx += acc
            }
        }

        this.simulation.on("tick", () => {
            const appNode = this.state.allNodes[0]
            orderingForce()
            appNode.x = 0
            appNode.y = 0
            vis.forceUpdate()
        })

    }
    componentWillUnmount(){
        this.simulation.stop()
    }

	render() {
        const { nodes, links } = this.state
        const setActive = (node, index) => {
            const defObject = getValue(this.props.objectTable, "definition", node.object, node.context, false)
            const defHash = getHash(defObject)
            const defTree = bfsObjectTree(this.props.objectTable, defObject, { nodes: [], links: [] }, [{ object: defObject, hash: defHash, level: node.level }])

            const defNodes = defTree.nodes
            const defLinks = defTree.links
            const left = nodes.slice(0,index)
            const right = nodes.slice(index)
            this.state.allNodes = left.concat(defNodes, right)
            const defLink = { source: node.hash, target: defHash, attr: "definition" }
            const contextLinks = contextToLinks(node.context)
            this.state.allLinks = links.concat(defLinks, [defLink], contextLinks)
            console.log(node.context, contextLinks)
            this.props.setActive(node)
            //console.log(this.state.links, this.state.links.concat([defLink]))
            this.simulation
                .nodes(this.state.allNodes)
                .force("link", d3.forceLink(this.state.allLinks)
                    .id((d) => (d.hash))
                    .strength(0)
                    )
                .alpha(0.2)
                .restart()
            //this.simulation.links(this.graph.links);
            //const contextLinks = node.context.map()


        }
        const nodesVis = this.state.allNodes.map((node, i) => (
            <Node
                x={node.x}
                y={node.y}
                level={node.level}
                nodeIndex={i}
                key={i}
                object={node.object}
                hash={node.hash}
                parId={node.parId}
                context={node.context}
                activeNode={this.props.activeNode}
                setActive={setActive}/>
        ), this) //set this for context
        const linksVis = this.state.allLinks.map((link, i) => (<Link source={link.source} target={link.target} attr={link.attr} type={link.type} key={i}></Link>))
        return <g>{nodesVis}{linksVis}</g>
	}
}
//sort nodes in bfs order to apply forces to them

const contextToLinks = (context) => (
    context.map((contextPath) => (
        contextPath.map((contextElem) => ({
            source: contextElem.sourceHash,
            target: contextElem.value,
            forwardAttr: contextElem.attr,
            type: "context"
        })
    ))).flat()
)
const bfsObjectTree = (objectTable, currentObj, d3Data, objQueue) => {
    objQueue = objQueue || [{ object: currentObj, level: 0 }]
    if (objQueue.length === 0) { return d3Data }
    d3Data = d3Data || { nodes: [], links: [] }
    const first = objQueue.shift()
    const level = first.level
    const i = d3Data.nodes.length
    const hash = getHash(first.object)
    const newD3Data = {
        nodes: d3Data.nodes.concat({ 
            id: i, 
            parId: first.parId, 
            object: first.object, 
            context: first.context, 
            objQueue, 
            level, 
            hash }),
        links: i<1 ? [] : d3Data.links.concat({ source: first.parId, target: hash, attr: first.attr })
    }
    const children = Object.entries(first.object)
        .filter((entry) => ( //filter out hash and inverse properties
            !['hash', 'name', 'instanceOf', INTERMEDIATE_REP, 'definition', 'mouse', 'id', 'keyboard', "lynxText", 'jsModule', 'jsRep', 'equalTo', 'op3'].includes(entry[0])
        ))
        .map((entry) => {
            const context = first.context || [[]]
            const attr = entry[0]
            const { value: object, context: newContext } = getValueAndContext(objectTable, attr, first.object, context)
            return { object: object, context: newContext, attr, hash, parId: hash, level: level+1 }
        })

    let structureChildren = []
    if (getPrimitiveType(first.object) === 'array'){
        const elements = first.object.lynxIR.value
        structureChildren = elements.map((element) => (
            { object: element, attr: 'elements', parId: i, level: level+1 }
        ))
    }
    const contiuneTree = getPrimitiveType(first.object) === 'get' && typeof first.object.rootObject !== 'string' && first.object.type !== INTERMEDIATE_REP
    const newQueue = contiuneTree ? objQueue : [...objQueue, ...children, ...structureChildren]
    return bfsObjectTree(objectTable, first.object, newD3Data, newQueue)
}

export default TreeVis