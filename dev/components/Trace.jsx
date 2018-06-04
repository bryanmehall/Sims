import React from "react"
const sum = (accumulator, currentValue) => (accumulator + currentValue);
const getChildWidths = (astNode) => {
    if (astNode === undefined || !astNode.hasOwnProperty('children')){
        return [50]
    } else if (Object.keys(astNode.children).length === 0) {
        return [50]
    } else {
        const childWidths = Object.keys(astNode.children).map(getChildWidths)
        const totalChildWidth = childWidths.reduce(sum,0)
        return [50].concat(totalChildWidth)
    }
}
const getWidth = (astNode) => {
    if (astNode === undefined || !astNode.hasOwnProperty('children')){
        return 75
    } else if (Object.keys(astNode.children).length === 0) {
        return 75
    } else {
        const childWidths = Object.keys(astNode.children).map(getWidth)
        return childWidths.reduce(sum,0)
    }
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
        const children = Object.keys(ast.children || {}) || []
        const width = getWidth(ast)
        let cumulativeWidth = 0
        const traceChildren = children.map((childName, index) => {
            const childAst = ast.children[childName]
            const subTraceWidth = getWidth(childAst)
            cumulativeWidth += subTraceWidth
            const childX = x+cumulativeWidth-width
            const childY = active ? y+150 : y+50
            const varLabel = (
                <text
                    x={(childX+x)/2}
                    y={(childY+y)/2}>
                    {children[index]}
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
                        stroke="black"
                        strokeWidth={active ? 0.1:1.2}
                        >
                    </line>
                    {active ? varLabel : null}
                    <Trace
                        x={childX}
                        y={childY}
                        ast={childAst}
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

		return (
            <g>
                <text
                    onMouseOver={function(){
                        self.setState({active:true})
                    }}
                    onMouseLeave={function(){
                        self.setState({active:false})
                    }}
                    textAnchor="middle"
                    fontWeight={self.state.active ? 600 : 400}
                    x={x}
                    y={y}
                    >
                    {ast.type+(active ? displayArgs(ast) : "")}
                </text>
                {displayVarDefs(ast, x, y)}
                {getStack}
                {traceChildren}
            </g>
		)
	}
}

const displayVarDefs = (ast , x, y) => {
    const varDefMap = (varDef, i) => (
        <Trace x={x} y={y+20*(i+1)} ast={varDef.ast} key={i}></Trace>
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
        .map((argKey) => (displayArg(ast.args[argKey])))
        .join(', ')
    return '('+display+')'
}
const displayArg = (arg) => {
    if (arg === true){
        return "prim"
    } else {
        const getAttrs = arg.getStack.map((get) => (get.props.attribute))
        return arg.query+'.'+getAttrs.join('.')
    }
}


export default Trace
