import React from "react"
import * as d3 from "d3"
import { formatArg } from '../ducks/object/utils'
import { objectFromName, getHash, getPrimitiveType, getAttr } from '../ducks/object/objectUtils'
import { LOCAL_SEARCH, GLOBAL_SEARCH, INVERSE } from '../ducks/object/constants'
import { getName } from './Debug'

class TreeVis extends React.Component {
    constructor(props){
        super(props)
        const appObject = objectFromName(this.props.objectTable, 'app')
        const { nodes, links } = bfsObjectTree(this.props.objectTable, appObject)
        addAST(this.props.ast, { nodes, links })
        this.state = { nodes, links }

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links)
                .id((d) => (d.id))
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
            for (var i = 0; i < vis.state.nodes.length; i++) {
                const currNode = vis.state.nodes[i]
                const prevNode = i === 0 ? { level: -1, x: 0 } : vis.state.nodes[i-1]
                if (currNode.level === prevNode.level){
                    if (currNode.x < prevNode.x+150){
                        const acc = (150-(currNode.x-prevNode.x))
                        currNode.vx += acc
                        prevNode.vx -= acc
                    }
                }
                const parNode = vis.state.nodes[currNode.parId] || { level: -1, x: 0 }
                const x = parNode === undefined ? 0 : parNode.x
                const diff = (x-currNode.x)
                const acc = Math.sign(diff)*Math.min(1, Math.abs(diff))
                parNode.vx -= acc*2
                currNode.vx += acc
            }
        }

        this.simulation.on("tick", () => {
            const appNode = this.state.nodes[0]
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
        const nodesVis = nodes.map((node, i) => (
            <Node
                x={node.x}
                y={node.y}
                level={node.level}
                id={i}
                key={i}
                ast={node.ast}
                object={node.object}
                activeNode={this.props.activeNode}
                setActive={this.props.setActive}/>
        ), this) //set this for context
        const linksVis = links.map((link, i) => (<Link source={link.source} target={link.target} attr={link.attr} key={i}></Link>))
        return <g>{nodesVis}{linksVis}</g>
	}
}
//sort nodes in bfs order to apply forces to them


const bfsObjectTree = (objectTable, currentObj, d3Data, objQueue) => {
    objQueue = objQueue || [{object: currentObj, level: 0 }]
    if (objQueue.length === 0) { return d3Data }
    d3Data = d3Data || { nodes: [], links: [] }
    const first = objQueue.shift()
    const level = first.level
    const i = d3Data.nodes.length
    const newD3Data = {
        nodes: d3Data.nodes.concat({ id: i, parId: first.parId, object: first.object, objQueue, level }),
        links: i<1 ? [] : d3Data.links.concat({ source: first.parId, target: i, attr: first.attr })
    }

    const children = Object.entries(first.object)
        .filter((entry) => ( //filter out hash and inverse properties
            !['hash', 'name', 'instanceOf', 'jsPrimitive', 'id', 'keyboard'].includes(entry[0])
        )).map((entry) => {
            const result = typeof entry[1] === 'string'
            ? [entry[0], objectFromName(objectTable, entry[1])]
            : [entry[0], { ...entry[1], hash: getHash(entry[1]) }] //add hash to object
            return result
        }).map((entry) => (//combine these
            Object.assign({}, { object: entry[1] }, { attr: entry[0], parId: i, level: level+1 })
        ))

    let structureChildren = []
    if (getPrimitiveType(first.object) === 'array'){
        const elements = first.object.jsPrimitive.value
        structureChildren = elements.map((element) => (
            { object: element, attr: 'elements', parId: i, level: level+1 }
        ))
    }
    const contiuneTree = getPrimitiveType(first.object) === 'get' && typeof first.object.rootObject !== 'string'
    const newQueue = contiuneTree ? objQueue : [...objQueue, ...children, ...structureChildren]
    return bfsObjectTree(objectTable, first.object, newD3Data, newQueue)
}

const getNodeIndex = (nodes, hash) => (nodes.findIndex((node) => (getHash(node.object) === hash)))

const addAST = (ast, nodesAndLinks) => { //helper function for addAST
    const { nodes, links } = nodesAndLinks
    const astIndexes = nodes.reduce(function(a, node, i) { //get all indexes
        if (getHash(node.object) === ast.hash || ast.hash === 'apphash' && node.object.hasOwnProperty('jsPrimitive') && node.object.jsPrimitive.type === 'app')
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
    const varDefChildren = ast.variableDefs.map((varDef) => (varDef.ast))

    return [...children, ...varDefChildren].reduce((nodesAndLinks, child) => (
        addAST(child, nodesAndLinks)
        ), { nodes, links })
}

const getPath = (nodes, hash) => {
    const defNode = nodes[getNodeIndex(nodes, hash)]
    const rootNodes = nodes.filter((node) => {
        const hasAST = node.hasOwnProperty('ast')
        if (hasAST) {
            return node.ast.variableDefs.some((varDef) => (varDef.key === hash))
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

const Node = ({ x, y, object, setActive, ast, activeNode }) => {
    const activeHash = activeNode.object.hash
    const active = activeHash === object.hash
    const name = getName(object)
    const isPrimitive = ast !== undefined
    let label = ''
    if (isPrimitive) {
        const activeVarDefs = ast.variableDefs.filter((varDef) => (varDef.key === activeHash))
        const context = typeof activeVarDefs[0] ==='undefined' ? null : activeVarDefs[0].context.map((context) => (context.debug)).join(',')
        if (ast.hasOwnProperty('value')){
            label = JSON.stringify(ast.value)
        } else {
            label = <tspan>{name === 'object'? ast.type : name}{active ? displayArgs(ast) : null}</tspan>
        }

    } else {
        label = name
    }

    return (
        <text
            onMouseOver={function(){
                setActive({ object, ast })
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


const Link = ({ source, target, attr }) => (
    <g>
        <line
            x1={source.x}
            y1={source.y+5}
            x2={target.x}
            y2={target.y-15}
            style={{
              stroke: "#000",
              strokeOpacity: ".9",
              strokeWidth: 1.6

            }}
        />
        <text
            x={source.x+(target.x-source.x)/2}
            y={source.y+30}
            textAnchor="middle"
            opacity = {0.3}
            >
            {attr}
        </text>
    </g>
)


export default TreeVis
