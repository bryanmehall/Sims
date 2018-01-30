import parser from './parser'

export const lynxParser = (lynxString) => {
    //convert indents to double curly braces so grammar is context free
    const lines = lynxString.split("\n")
    let outString = ""
    let indentLevel = 0
    lines.forEach((line) => {
        const indents = Math.floor(Math.abs(line.split("").findIndex((char) => (char !== " "))/4))
        const change = indents-indentLevel
        indentLevel = indents
        if (change === 0){
            outString += ("\n"+line)
        } else if (change >= 1){
            outString += ("{{".repeat(change)+"\n"+line)
        } else if (change <= -1){
            outString += ("}}".repeat(Math.abs(change))+"\n"+line)
        }
    })
    console.log(outString)
    try {
        const out = parser.parse(outString+"}}")

        return out
    } catch(e) {
        console.warn("parsing failed", e.message, e.location.start, e.location.end)
    }
}
