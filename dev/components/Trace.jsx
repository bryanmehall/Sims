import React from "react"
import { formatArg } from '../ducks/object/utils'
import { LOCAL_SEARCH, THIS, GLOBAL_SEARCH, INVERSE } from '../ducks/object/constants'
const sum = (accumulator, currentValue) => (accumulator + currentValue);
const getChildWidths = (astNode) => {
    if (astNode === undefined || !astNode.hasOwnProperty('children')){
        return [25]
    } else if (Object.keys(astNode.children).length === 0) {
        return [20]
    } else {
        const childWidths = Object.keys(astNode.children).map(getChildWidths)
        const totalChildWidth = childWidths.reduce(sum,0)
        return [20].concat(totalChildWidth)
    }
}
const getWidth = (astNode) => {
    if (astNode === undefined || !astNode.hasOwnProperty('children')){
        return 60
    }
    const subNodes = combineChildrenAndVarDefs(astNode)
    if (Object.keys(subNodes).length === 0) {
        return 50
    } else {
        const childWidths = Object.keys(subNodes).map(getWidth)
        return childWidths.reduce(sum,0)
    }
}
const combineChildrenAndVarDefs = (ast) => {
	const childList = Object.entries(ast.children)
		.map((child) => ({ name: child[0], ast:child[1], type:"child"}))
	const varDefList = ast.variableDefs.map((varDef) => ({...varDef, type:"varDef"}))
	return childList.concat(varDefList)
}

class Trace extends React.Component {
    constructor(props){
        super(props)
        this.state = { active: false }
    }
	render() {
        const self = this
		const { ast, x, y } = this.props
        const active = this.state.active
        if (ast === undefined){
            return <text x={x} y={y} textAnchor="middle">undef</text>
        }
		const childNodes = combineChildrenAndVarDefs(ast)
        const width = getWidth(ast)

        let cumulativeWidth = 0
        const traceChildren = childNodes.map((child, index) => {
            const childAst = child.ast
            const subTraceWidth = getWidth(childAst)
            cumulativeWidth += subTraceWidth
            const childX = x+cumulativeWidth-width/2
            const childY = active ? y+150 : y+50
            const varLabel = (
                <text
                    x={(childX+x)/2}
                    y={(childY+y)/2}>
                    { child.name}
                </text>
            )
            return (
                <g
                    key={index}
                >
                    <line
                        x1={x}
                        x2={childX}
                        y1={y+3}
                        y2= {childY-15}
                        stroke={child.type === "child" ? "black": "#006cff"}
                        strokeWidth={active ? 0.1:1.6}
                        >
                    </line>
                    {active ? varLabel : null}
                    <Trace
                        x={childX}
                        y={childY}
                        ast={childAst}
                        setActive={this.props.setActive}
                    ></Trace>
                </g>
            )
        })
        const renderGetObject = (getObject) => (
            getObject.props.attribute
        )
        let getStack
        /*if (ast.hasOwnProperty('args')){
            const getData = Object.entries(ast.args)[0][1]
            getStack = <text x={x} y={y+15} textAnchor="middle">

            </text>
        } else {
            getStack = "abc"
        }*/
		const nodeLabel = ast.hasOwnProperty('value') ? ast.value : ast.type
		return (
            <g>
                <text
                    onMouseOver={function(){
                        self.setState({ active: true })
                        self.props.setActive(ast)
                    }}
                    onMouseLeave={function(){
                        self.setState({ active: false })
                    }}
                    textAnchor="middle"
                    fontWeight={self.state.active ? 600 : 400}
                    x={x}
                    y={y}
                    >
                    {nodeLabel}{(active ? displayArgs(ast) : "")}
                </text>
                {getStack}
                {traceChildren}
            </g>
		)
	}
}

const displayVarDefs = (ast , x, y) => {
    const varDefMap = (varDef, i) => (
        <Trace
            x={x}
            y={y}
            ast={varDef.ast}
            key={i}
            setActive={this.props.setActive}
            ></Trace>
    )
    const astList = ast.hasOwnProperty('variableDefs') ? ast.variableDefs.map(varDefMap) : []
    return (
        <g>
            {astList}
        </g>
    )
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


export default Trace
