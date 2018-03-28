import React from "react"
const sum = (accumulator, currentValue) => (accumulator + currentValue);
const getWidth = (trace) => {
    if (trace === undefined || !trace.hasOwnProperty('subTraces')){
        return 50
    } else if (trace.subTraces.length === 0) {
        return 50
    } else {
        const subTraceWidths = trace.subTraces.map(getWidth)
        return subTraceWidths.reduce(sum,0)
    }
}

class Trace extends React.Component {
    constructor(props){
        super(props)
        this.state = {active:false}
    }
	render() {
        const self = this
		const { trace, x, y, setCenter} = this.props
        const active = this.state.active
        if (trace=== undefined){return <text x={x} y={y} textAnchor="middle">undef</text>}
        const subTraces = trace.subTraces || []
        const width = getWidth(trace)
        let cumulativeWidth = 0
        const traceChildren = subTraces.map((subTrace, index)=>{
            const subTraceWidth = getWidth(subTrace)
            cumulativeWidth += subTraceWidth
            const childX = x+cumulativeWidth-width
            const childY = active ? y+150 : y+50
            const varLabel = (
                <text
                    x={(childX+x)/2}
                    y={(childY+y)/2}>
                        {trace.vars[index]}
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
                        y2={childY-15}
                        stroke="black"
                        strokeWidth={active ? 0.1:1.2}
                        >
                    </line>

                    {active ? varLabel : null}
                    <Trace
                        setCenter = {setCenter}
                        x={childX}
                        y={childY}
                        trace={subTrace}
                    ></Trace>
                </g>
            )
        })
        const renderGetObject = (getObject) => (
            getObject.props.attribute
        )
        let getStack
        if (trace.hasOwnProperty('args')){
            const getData = Object.entries(trace.args)[0][1]
            getStack = <text x={x} y={y+15} textAnchor="middle">
                {getData.query}.{getData.getStack.map(renderGetObject).join(".")}
            </text>
        } else {
            getStack = "abc"
        }

		return (
            <g>
                <text
                    onMouseOver={function(){
                        self.setState({active:true})
                    }}
                    onMouseLeave={function(){
                        self.setState({active:false})
                    }}
                    onClick = {()=>{setCenter(x,y)}}
                    textAnchor="middle"
                    fontWeight={self.state.active ? 700 :400}
                    x={x}
                    y={y}
                    >
                    {trace.type}
                </text>
                {getStack}
                {traceChildren}
            </g>
		)
	}
}



export default Trace
