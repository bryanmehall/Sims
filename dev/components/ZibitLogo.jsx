import React from 'react'

export default class ZibitLogo extends React.Component {
  render() {
	  const r = 5/4 //ratio of height to width --this is correct for 5/4 but broken otherwise
	  const w = this.props.width || 30//width
	  const h = w*r //height
	  const t = w/4 //thickness
	  const topColor ="#00ffff"
	  const diagonalColor="#5858de"
	  const bottomColor = "#58de58"
	  const diagonalOpacity = 0.6

	  const pos = this.props.pos || { x: 0, y: 0 }
	  const slope = h/(w-t*r)
	  const topPath = 'M0 0 L'+w+' 0L'+(w-t/slope)+' '+t+'L0 '+t
	  const diagonalPath = 'M'+(w-t*r)+' 0L'+w+' 0L'+(t*r)+' '+h+'L0 '+h

	  const top = (
		  <path
			  d={topPath}
			  fill={topColor}
			  />
	  )//top bar
      const diagonal = (
		  <path
                       fill={diagonalColor}
                       opacity={diagonalOpacity}
                       d={diagonalPath}/>)
       const whiteMask = (
		   <path
			   fill="white"
			   d={diagonalPath}
			   />
	   )
       const bottom = (
		   <path
                  d={topPath}
                      fill={bottomColor}
                  transform={'translate('+w+','+h+') rotate(180)'}
                      />)
    return (
      <svg width={w} height={h}>
		<g transform={'translate('+pos.x+','+pos.y+')'}>
        {whiteMask}
        {top}
        {bottom}
        {diagonal}

       </g>
		</svg>
    )
  }
}