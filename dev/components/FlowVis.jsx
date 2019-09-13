import React from "react"
import { cardStyle } from './styles'

class FlowVis extends React.Component {
    constructor(props){
		super(props)
        this.state = { time: 0 }

    }
    render(){
        const width = 800
        const height = 500
        const padding = 250
        const vPadding = 30
        const runtime = this.props.runtime
        if (runtime === null){
            return <div>loading</div>
        }

        const inputEntries = Object.entries(runtime.inputs)
        const inputNumber = inputEntries.length
        const inputSpacing = (height-vPadding*2)/inputNumber
        const getInputIndex = (inputKey) => (inputEntries.findIndex((entry) => (entry[0] === inputKey)))
        const getIOPosition = (inputIndex, spacing) => (spacing*inputIndex+vPadding+spacing/2)
        const inputMarkers = inputEntries.map((entry, i) => (
                <text
                    key={entry[0]}
                    x={padding-3}
                    y={getIOPosition(i, inputSpacing)}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    fill={entry[1].available ? 'green' : 'red'}
                    >
                    { entry[0]}: {JSON.stringify(entry[1].value)}
                </text>
            ))
        const outputEntries = Object.entries(runtime.outputs)
        const outputNumber = outputEntries.length
        const outputSpacing = (height-vPadding*2)/outputNumber
        const outputMarkers = outputEntries.map((entry, i) => {
            const inputList = entry[1].inputs
            const inputLines = inputList.map((inputKey, j) => {
                const inputY = getIOPosition(getInputIndex(inputKey), inputSpacing)
                const outputY = getIOPosition(i, outputSpacing)
                return <line key={`${i}-${j}`} x1={padding} x2={width-padding} y1={inputY} y2={outputY} stroke="gray"></line>

            })

            return (
                <g
                    key={entry[0]}>
                    <text
                        x={width-padding+3}
                        y={outputSpacing*i+vPadding+outputSpacing/2}
                        alignmentBaseline="middle"
                        >
                        {entry[0]}
                    </text>
                    <text
                        x={width-padding+3}
                        y={outputSpacing*i+vPadding+outputSpacing/2+13}
                        alignmentBaseline="middle"
                        >
                        {JSON.stringify(entry[1].prevValues)}
                    </text>
                    {inputLines}
                </g>
             )
        })
        return (
            <div style={{ ...cardStyle, backgroundColor: "white", position: 'absolute', padding: 20, top: 547 }}>
            <svg height={height} width={width}>
                <text x={padding} y={vPadding-10} textAnchor="middle">inputs</text>
                <text x={width-padding} y={vPadding-10} textAnchor="middle">outputs</text>
                <line stroke="black" strokeWidth="1px" x1={padding} y1={vPadding} x2={padding} y2={height-vPadding}></line>
                <line stroke="black" strokeWidth="1px" x1={width-padding} y1={vPadding} x2={width-padding} y2={height-vPadding}></line>
                {inputMarkers}
                {outputMarkers}
            </svg>
            </div>
        )
    }
}

export default FlowVis
