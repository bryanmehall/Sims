import { getName } from './Debug'
import { getHash } from '../ducks/object/hashUtils'
import React from "react"

export const Node = (node) => {
    const { x, y, object, setActive, ast, activeNode, nodeIndex } = node
    const activeHash = activeNode.object.hash
    const active = activeHash === getHash(object)
    const name = getName(object)
    const isPrimitive = ast !== undefined
    const label = name

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