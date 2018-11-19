import React from "react"
import * as d3 from "d3"
import { formatArg } from '../ducks/object/utils'
import { LOCAL_SEARCH, THIS, GLOBAL_SEARCH, INVERSE } from '../ducks/object/constants'

class AstVis extends React.Component {
    constructor(props){
        super(props)
        //const { nodes, links } = astToD3(this.props.ast)
        const { nodes, links } = bfsAST(this.props.ast)
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
                .strength(0.2)
                )
            .force("l1", isolate(d3.forceManyBody().strength(-200), (d) => (d.ast.level === 1)))
            .force("l2", isolate(d3.forceManyBody().strength(-200), (d) => (d.ast.level === 2)))
            .force("l3", isolate(d3.forceManyBody().strength(-200), (d) => (d.ast.level === 3)))
            .force("l4", isolate(d3.forceManyBody().strength(-200), (d) => (d.ast.level === 4)))
            .force("l5", isolate(d3.forceManyBody().strength(-200), (d) => (d.ast.level === 5)))
            .force("a", d3.forceManyBody() )

            .force("forceY", d3.forceY()
                .strength(1)
                .y((d) => (d.ast.level*60)
                )
            )
    }
    componentDidMount(){
        const vis = this
        const orderingForce = () => {
            for (var i = 0; i < vis.state.nodes.length; i++) {
                const currNode = vis.state.nodes[i]
                const prevNode = i === 0 ? { ast: { level: -1 }, x: 0 } : vis.state.nodes[i-1]
                if (currNode.ast.level === prevNode.ast.level){
                    if (currNode.x < prevNode.x){
                        vis.state.nodes[i].x += 50;
                    } else {
                        //vis.state.nodes[i].x -= 1;
                    }
                }
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
                queue={node.queue.length}
                id={i}
                key={i}
                ast={node.ast}
                setActive={this.props.setActive}/>
        ))
        const linksVis = links.map((link, i) => (<Link source={link.source} target={link.target} key={i}></Link>))
        return <g>{nodesVis}{linksVis}</g>
	}
}
let id = 0
let queue = []
const astToD3 = (ast, level, parId) => {
    parId = typeof parId === 'undefined' ? 0 : parId
    level = level || 0

    const children = Object.entries(ast.children).map((entry) => {
        const attr = entry[0]
        const childAst = entry[1]

        const newLink = { source: parId, target: id }
        const childD3 = astToD3(childAst, level+1, id)
        return { nodes: childD3.nodes, links: [...childD3.links, newLink] }
    })
    const varDefs = ast.variableDefs.map((varDef) => {
        const newLink = { source: parId, target: id }
        id+=1
        const childD3 = astToD3(varDef.ast, level+1, id)
        return { nodes: childD3.nodes, links: [...childD3.links, newLink] }
    })
    const reducer = (acc, current) => (
        { nodes: [...acc.nodes, ...current.nodes], links: [...acc.links, ...current.links] }
    )
    const newNode = { id, ast, level }
    return [...children, ...varDefs].reduce(reducer, { nodes: [newNode], links: [] })
}
//sort nodes in bfs order to apply forces to them
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
    const varDefASTs = first.variableDefs.map((varDef) => (Object.assign({}, varDef.ast, { parId: i, level: level+1, varDef: true })))
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
        const { x, y, ast, setActive, id } = this.props
        const self = this
        const active = this.state.active
        return (
            <text
                onMouseOver={function(){
                    self.setState({ active: true })
                    setActive(ast)
                }}
                onMouseLeave={function(){
                    self.setState({ active: false })
                }}
                textAnchor="middle"
                fontWeight={self.state.active ? 600 : 400}
                opacity = {self.state.active ? 1 : 0.7}
                x={x}
                y={y}
                >
                {ast.hasOwnProperty('value') ? ast.value : ast.type}
                {(active ? displayArgs(ast) : "")}
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
          stroke: target.ast.varDef ? "#00f":"#000",
          strokeOpacity: ".9",
          strokeWidth: 1.6

        }}
    />
)


export default AstVis
