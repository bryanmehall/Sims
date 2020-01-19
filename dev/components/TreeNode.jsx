import { getName } from './Debug'
import React from "react"

export const Node = (node) => {
    const { x, y, object, setActive, activeNode, nodeIndex, hash } = node
    const active = activeNode.hash === hash
    const name = getName(object)
    const isPrimitive = object.hasOwnProperty('jsRep')
    const label = isPrimitive ? JSON.stringify(object.jsRep) : name
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

export const Link = ({ source, target, attr, type }) => {
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