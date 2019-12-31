import React from "react"
import * as d3 from "d3"
import { formatArg } from '../ducks/object/utils'
import { objectFromName, getHash, getPrimitiveType, getValue } from '../ducks/object/objectUtils'
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE, INTERMEDIATE_REP } from '../ducks/object/constants'
import  { createParentContext } from '../ducks/object/contextUtils'
import { getName } from './Debug'

class TreeVis extends React.Component {
    constructor(props){
        super(props)
        const appObject = objectFromName(this.props.objectTable, 'app')
        const { nodes, links } = bfsObjectTree(this.props.objectTable, appObject)
        addAST(this.props.ast, { nodes, links })
        this.state = { nodes, links, allNodes:nodes, allLinks:links }
        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links)
                .id((d, i, n) => {return d.object.hash})
                .strength(0.8)
                )
            .force("forceY", d3.forceY()
                .strength(3)
                .y((d) => (d.level*60)
                )
            )
    }
    componentDidMount(){
        const vis = this
        const nodes = this.state.allNodes
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
                parNode.vx -= 0.1*acc
                currNode.vx += 0.1*acc
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
        getPath(nodes, this.props.activeNode.object.hash)
        const setActive = (node, index) => {
            const definitionIsGet = node.object.definition.hasOwnProperty("lynxIR") && node.object.definition.lynxIR.type === 'get'
            const defNode = getValue(this.props.objectTable, "definition", node.object, node.context, definitionIsGet)
            console.log(defNode, node.object)
            const defTree = bfsObjectTree(this.props.objectTable, defNode, { nodes: [], links: [] }, [{ object: defNode, level: node.level }])

            const defNodes = defTree.nodes
            const defLinks = defTree.links
            const left = nodes.slice(0,index)
            const right = nodes.slice(index)
            this.state.allNodes = left.concat(defNodes, right)
            const defLink = {source:node.object.hash, target: defNode.hash, attr:"definition"}
            const contextLinks = contextToLinks(node.context)
            console.log(contextLinks)
            this.state.allLinks = links.concat(defLinks, [defLink], contextLinks)
            this.props.setActive(node)
            //console.log(this.state.links, this.state.links.concat([defLink]))
            this.simulation
                .nodes(this.state.allNodes)
                .force("link", d3.forceLink(this.state.allLinks)
                    .id((d, i, n) => {return d.object.hash})
                    .strength(0)
                    )
                .alpha(0.2).restart()
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
                ast={node.ast}
                object={node.object}
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
    context[0].map((contextElem) => ({
        source: contextElem.sourceHash,
        target: contextElem.value,
        attr: contextElem.attr,
        type: "context"
    }))
)
const bfsObjectTree = (objectTable, currentObj, d3Data, objQueue) => {
    objQueue = objQueue || [{ object: currentObj, level: 0 }]
    if (objQueue.length === 0) { return d3Data }
    d3Data = d3Data || { nodes: [], links: [] }
    const first = objQueue.shift()
    const level = first.level
    const i = d3Data.nodes.length
    const newD3Data = {
        nodes: d3Data.nodes.concat({ id: i, parId: first.parId, object: first.object, context: first.context, objQueue, level }),
        links: i<1 ? [] : d3Data.links.concat({ source: first.parId, target: first.object.hash, attr: first.attr })
    }
    const children = Object.entries(first.object)
        .filter((entry) => ( //filter out hash and inverse properties
            !['hash', 'name', 'instanceOf', INTERMEDIATE_REP, 'definition', 'mouse', 'id', 'keyboard', "lynxText", 'jsModule', 'canvasRep'].includes(entry[0])
        ))
        .map((entry) => {
            const context = first.context || []
            const attr = entry[0]
            const newContext = createParentContext(objectTable, context, first.object, attr)
            const object = getValue(objectTable, attr, first.object, newContext, false)
            newContext[0][0].sourceHash = getHash(object) //add sourceHash for debug
            return { object: object, context: newContext, attr, parId: first.object.hash, level: level+1 }
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

const getNodeIndex = (nodes, hash) => (nodes.findIndex((node) => (getHash(node.object) === hash)))

const addAST = (ast, nodesAndLinks) => { //helper function for addAST
    const { nodes, links } = nodesAndLinks
    const astIndexes = nodes.reduce(function(a, node, i) { //get all indexes
        if (getHash(node.object) === ast.hash || ast.hash === 'apphash' && node.object.hasOwnProperty(INTERMEDIATE_REP) && node.object.lynxIR.type === 'app')
            a.push(i)
        return a
    }, [])
    astIndexes.forEach((astIndex) => {
        if (astIndex !== -1){
            const astNode = nodes[astIndex]
            nodes[astIndex] = { ...astNode, ast }
        }
    })

    const children = Object.values(ast.children)
    const varDefChildren = ast.varDefs.map((varDef) => (varDef.ast))

    return [...children, ...varDefChildren].reduce((nodesAndLinks, child) => (
        addAST(child, nodesAndLinks)
        ), { nodes, links })
}

const getPath = (nodes, hash) => {
    const defNode = nodes[getNodeIndex(nodes, hash)]
    const rootNodes = nodes.filter((node) => {
        const hasAST = node.hasOwnProperty('ast')
        if (hasAST) {
            return node.ast.varDefs.some((varDef) => (varDef.key === hash))
        } else {
            return false
        }
    })
    return { defNode, rootNodes }
}

const displayArgs = (ast) => {
    const display = Object.keys(ast.args)
        .map((argKey, i) => ([i=== 0 ? '' : ', ', displayArg(ast.args[argKey], argKey)]))
    return <tspan>{'('}{display}{')'}</tspan>
}

const displayArg = (arg, argKey) => {
    const color = (arg.type === LOCAL_SEARCH) ? "green" :
        arg.type === INVERSE ? 'red' :
        arg.type === GLOBAL_SEARCH ? 'purple' :
        "black"
    return <tspan key={argKey} style={{ fill: color }}>{formatArg(arg)}</tspan>
}
const formatText = (str, x, y) => {
    const string = typeof str === 'string'? str : JSON.stringify(str)
    return string.replace(/\t/g, '____')
        .split('\n')
        .map((line, i) => (<tspan key={i} textAnchor="start" x={x-10} y={y+20*i}>{line}</tspan>))
}
const Node = (node) => {
    const { x, y, object, setActive, ast, activeNode, context, nodeIndex } = node
    const activeHash = activeNode.object.hash
    const active = activeHash === getHash(object)
    const name = getName(object)
    const isPrimitive = ast !== undefined
    let label = ''
    if (isPrimitive) {
        const activeVarDefs = ast.varDefs.filter((varDef) => (varDef.key === activeHash))
        const context = typeof activeVarDefs[0] ==='undefined' ? null : activeVarDefs[0].context[0].map((context) => (context.debug)).join(',')
        if (ast.hasOwnProperty('value')){
            if (Array.isArray(ast.value)){
                label = <tspan>[array]{active ? displayArgs(ast) : null}</tspan>
            } else {
                label = formatText(JSON.stringify(ast.value), x, y)
            }
        } else {
            label = <tspan>{name === 'object'? ast.type : name}{active ? displayArgs(ast) : null}</tspan>
        }

    } else if (object.hasOwnProperty(INTERMEDIATE_REP)) {
        if (object.lynxIR.hasOwnProperty('value')){
            label = formatText(object.lynxIR.value, x, y)
        } else {
            label = name
        }
    } else {
        label = name
    }

    return (
        <text
            onClick={function(){
                setActive(node, nodeIndex)
            }}
            onMouseLeave={function(){

            }}
            textAnchor="middle"
            fontWeight={active ? 600 : 400}
            opacity = {active ? 1 : 0.7}
            fill={isPrimitive? 'blue': 'black'}
            x={x}
            y={y}
            >
            {label}
        </text>
    )
}


const Link = ({ source, target, attr, type }) => {
    const color = attr === "definition" ? 'purple' : type === "context" ? "red" :  'black'
    const inverse = Math.sign(source.y-target.y)

    return (
    <g>
        <line
            x1={attr === "definition" ? source.x-40 : source.x}
            y1={attr === "definition" ? source.y-5 : source.y-5*inverse}
            x2={attr === "definition" ? target.x+40 : target.x}
            y2={attr === "definition" ? target.y-5 : target.y+15*inverse}
            style={{
                stroke: color,
                strokeOpacity: ".7",
                strokeWidth: 1.6

            }}
        />

        <text
            x={source.x+(target.x-source.x)/2}
            y={source.y+(target.y-source.y)/2+10*inverse}
            stroke={color}
            textAnchor="middle"
            opacity = {0.3}
            >
            {attr}
        </text>
    </g>)
}


export default TreeVis
