const attrs = ["item 1", "item2" , "item3"]
const listToText = (attrs) => {
	if (attrs.length === 0){
  	return []
  } else {
  	const previousElements = listToText(attrs.slice(0,-1))
  	const xPos = previousElements.length === 0 ? 0 : previousElements[previousElements.length-1].right
    const text = {
      x: xPos,
      y: 20,
      innerText: attrs[attrs.length-1],
      right: xPos+20
    }
    return previousElements.concat(text)
  }

}
console.log(listToText(attrs))
