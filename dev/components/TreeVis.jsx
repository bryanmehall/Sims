import React from "react"
import * as d3 from "d3"
import { formatArg } from '../ducks/object/utils'
import { objectFromName } from '../ducks/object/objectUtils'
import { LOCAL_SEARCH, THIS, GLOBAL_SEARCH, INVERSE } from '../ducks/object/constants'

class TreeVis extends React.Component {
    constructor(props){
        super(props)
        //const { nodes, links } = astToD3(this.props.ast)
        //const { nodes, links } = bfsAST(this.props.ast)
        console.log(this.props.ast)
        const appObject = objectFromName('app', this.props.objectTable)
        const { nodes, links } = bfsObjectTree(this.props.objectTable, appObject)
        console.log(nodes, links)
        const vis = this
        //console.log(nodes, links)
        //throw 'here'
        this.state = { nodes, links }
        const isolate = (force, filter) => {
          const initialize = force.initialize;
          force.initialize = function() { initialize.call(force, nodes.filter(filter)); };
          return force;
        }

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
                const prevNode = i === 0 ? {level: -1, x: 0 } : vis.state.nodes[i-1]
                const nextNode = i === vis.state.nodes.length-1 ? {  level: -1 , x: 0 } : vis.state.nodes[i+1]
                if (currNode.level === prevNode.level){
                    if (currNode.x < prevNode.x+80){
                        const acc = (80-(currNode.x-prevNode.x))
                        currNode.vx += acc
                        prevNode.vx -= acc
                    }
                }
                /*if (nextNode.ast.level === currNode.ast.level){
                    if (nextNode.x < currNode.x+90){
                        currNode.vx -= (90-(nextNode.x-currNode.x))
                    }
                }*/
                const parNode = vis.state.nodes[currNode.object.parId] || {  level: -1, x: 0 }
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
	render() {
        const { nodes, links } = this.state
        const nodesVis = nodes.map((node, i) => (
            <Node
                x={node.x}
                y={node.y}
                level={node.level}
                id={i}
                key={i}
                object={node.object}
                setActive={this.props.setActive}/>
        ))
        const linksVis = links.map((link, i) => (<Link source={link.source} target={link.target} key={i}></Link>))
        return <g>{nodesVis}{linksVis}</g>
	}
}
let id = 0
let queue = []
//sort nodes in bfs order to apply forces to them


const bfsObjectTree = (objectTable, currentObj, d3Data, objQueue) => {
    objQueue = objQueue || [Object.assign({}, currentObj, { level: 0 })]
    if (objQueue.length === 0) { return d3Data }
    d3Data = d3Data || { nodes: [], links: [] }
    const first = objQueue.shift()
    const level = first.level
    const i = d3Data.nodes.length
    const newD3Data = {
        nodes: d3Data.nodes.concat({ id: i, object: first, objQueue, level }),
        links: i<1 ? [] : d3Data.links.concat({ source: first.parId, target: i })
    }
    const propList = first.hasOwnProperty('props') ? Object.entries(first.props) : []
    const entries = propList
        .filter((entry) => { //filter out hash and inverse properties
            const inverses = first.inverses || {}
            return !['hash', 'name', 'instanceOf', 'jsPrimitive', 'id'].includes(entry[0]) && !inverses.hasOwnProperty(entry[0])
        }).map((entry) => (
            typeof entry[1] === 'string' ? [entry[0], objectFromName(entry[1], objectTable)] : entry
        ))
    const children = entries.map((entry) => (Object.assign({}, entry[1], { attr: entry[0], parId:i, level:level+1 })))

    const newQueue = [...objQueue, ...children]
    return bfsObjectTree(objectTable, first, newD3Data, newQueue)
}
const bfsAST = (ast, d3Data, queue) => {
    queue = queue || [Object.assign({}, ast, { level: 0 })]
    if (queue.length === 0) { return d3Data }
    d3Data = d3Data || { nodes: [], links: [] }

    const first = queue.shift()
    const level = first.level
    const i = d3Data.nodes.length
    const newD3Data = {
        nodes: d3Data.nodes.concat({ id: i, ast: first, queue }),
        links: i<1 ? [] : d3Data.links.concat({ source: first.parId, target: i })
    }

    const childrenASTs = Object.values(first.children)
        .map((ast) => (Object.assign({}, ast, { parId: i, level: level+1 })))
    const varDefASTs = first.variableDefs
        .map((varDef) => (Object.assign({}, varDef.ast, { parId: i, level: level+1, varDef: true })))

    const newQueue = [...queue, ...childrenASTs, ...varDefASTs]
    return bfsAST(first, newD3Data, newQueue)
}

const displayArgs = (ast) => {
    const display = Object.keys(ast.args)
        .map((argKey, i) => ([i=== 0 ? '' : ', ', displayArg(ast.args[argKey], argKey)]))
    return <tspan>{'('}{display}{')'}</tspan>
}

const displayArg = (arg, argKey) => {
    if (arg === true){
        return <tspan key={"prim"} style={{ fill: 'gray' }}>{'prim'}</tspan>
    } else {
        const getAttrs = arg.getStack.map((get) => (get.props.attribute))
        const color = (arg.type === LOCAL_SEARCH) ? "green" :
            arg.type === INVERSE ? 'red' :
            arg.type === GLOBAL_SEARCH ? 'purple' :
            "black"
        return <tspan key={argKey} style={{ fill: color }}>{formatArg(arg)}</tspan>
    }
}

class Node extends React.Component {
    constructor(props){
        super(props)
        this.state = { active: false }
    }
    render(){
        const { x, y, object, setActive } = this.props
        const self = this
        const active = this.state.active
        const nameObject = object.props.name
        const name = typeof nameObject === 'undefined' ? 'object' : nameObject.props.jsPrimitive.value
        const isPrimitive = object.props.hasOwnProperty('jsPrimitive')
        const hasValue = isPrimitive ? object.props.jsPrimitive.hasOwnProperty('value') : false
        const label = hasValue ? object.props.jsPrimitive.value : name
        return (
            <text
                onMouseOver={function(){
                    self.setState({ active: true })
                    //setActive(ast)
                }}
                onMouseLeave={function(){
                    self.setState({ active: false })
                }}
                textAnchor="middle"
                fontWeight={active ? 600 : 400}
                opacity = {active ? 1 : 0.7}
                fill={isPrimitive? 'blue': 'black'}
                x={x}
                y={y}
                >
                {label}{active ? object.hash : null}
            </text>
        )
    }
}

const Link = ({ source, target }) => (
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
)


export default TreeVis
