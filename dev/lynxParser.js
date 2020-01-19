import parser from './parser'
//pegjs --track-line-and-column --cache parser.peg

export const coreFiles = ["core", 'operators']

export const lynxParser = (lynxString) => {
    //convert indents to double curly braces so grammar is context free
    const lines = lynxString.split("\n")
    let outString = ""
    let indentLevel = 0
    lines.forEach((line, i) => {
		const indentPos = line.replace("\t", "    ")
			.split("")
			.findIndex((char) => (char !== " "))/4
        const indents = Math.floor(Math.abs(indentPos))
        const change = indents-indentLevel
        indentLevel = indents
        if (change === 0){
            if (i === 0){
                outString += line
            } else {
                outString += ("\n"+line)
            }
        } else if (change >= 1){
            outString += ("{#{".repeat(change)+"\n"+line)
        } else if (change <= -1){
            outString += ("}#}".repeat(Math.abs(change))+"\n"+line)
        }
    })
    return parser.parse(outString)
    //throw new Error(`parsing failed: ${e.message} line: ${e.line} column:${e.column}`)

}
