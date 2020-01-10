{
//from dev folder run $pegjs --cache parser.pegjs
//var flattenState = options.flattenState
var symbolTable = {
    "+":"addition",
    "*":"multiplication",
    "-":"subtraction",
    "/":"division",
    "<":"lessThan",
    ">":"greaterThan",
    "==":"equal",
    "&&":"and",
    "||":"or"
}

function createString(str){
	return {
        jsRep:str,
        lynxIR:{type:"string", value:str}
	}
}

function textRep(obj) {
    return Object.entries(obj).reduce(function(textRep, entry){
        return `${textRep}\n\t${entry[0]}:20`
    }, "")
}
function createDef(str){
    var string = createString(str)
    return createNOp([string], "parse")
}

function createNOp(args, op, defaultState){
    const applyObject = {
        lynxIR:{type:"apply"},
        function:op,
        instanceOf:"apply"
        //result:"$applyPrimitive$"
    }
    if (typeof defaultState !== 'undefined' && defaultState !== ""){
        applyObject.defaultState = defaultState
    }
    args.forEach((arg, i) => {
        applyObject["op"+(i+1)] = arg
    })
    return createReferenceNode(applyObject, "result")
}

function createFunction(name){
	return {
        	name:createString(name),
        	lynxIR:{type:"function"}
    }
}
function createArray(elementValues){
    var elements = elementValues.map(function(value, i){
        return {
            instanceOf:"element",
            elementValue:value
        }
    })
    return {
            instanceOf:"array",
            lynxIR:{ type:"array", value:elements}
    }
}
function buildPath(rootObject, attr, str){
    var getData = {
        lynxIR:{type:"get"},
        instanceOf:"get",
        attribute:attr[1]
    }
    if (rootObject !== null){
        getData.rootObject = rootObject
    }
    return getData
}

function createReferenceNode(rootObject, attribute) {
    var getData = {
        lynxIR:{type:"get"},
        instanceOf:"get",
        rootObject: rootObject,
        attribute:attribute
    }
    return getData
}

}
start
  = Module
  
Module 
	= declarations:(Declaration "\n"*)+ {
    	var objects = {}
        declarations.forEach(function(declaration){
            var object = declaration[0].object
            var id = declaration[0].id
        	objects[id] = object
        })
        
        return objects
    }
    / Object
    / Expression

Declaration
	= "\n"*id:Name _ "="_ object:Object {
        if (id === "object" ||id === "get" ){
            return {object:{initialObjectType:id} , id:id}
        }
        return { object: object, id: id } 
        }
    / BlockComment

Object "object"
	= value:New "{#{"?attributes:("\n""    "*Attribute)*"}#}"? {
    	var props = {}
    	attributes.forEach(function(attr){props[attr[2].name] = attr[2].value})
        props.instanceOf = props.hasOwnProperty('instanceOf') ? props.instanceOf : value
        //props.definition = props.hasOwnProperty('definition') ? props.definition : createDef("new object"+textRep(props)+"\n")
    	return props
    }

Attribute 
    = name:Name":"" "?value:(Expression) _ Comment? {
        return {
        	name:name,
            value:value
       }
   }
Expression "expression"
	=  Conditional / Array

DefaultState "defaultState"
    = "("defaultState:Expression")" {return defaultState}

Conditional "conditional"
    =  condition:Or _ "?"_ then:Expression _":"_ alt:Expression {
    return createNOp([condition, then, alt], "conditional")
    }
    / MultilineConditional
    / Or

MultilineConditional "multiline conditional" 
    = "condition" _ defaultState:DefaultState? "{#{" cases:(ConditionalCase)+ defaultCase:("\n""    "* Expression _ )"}#}"{
        return cases.reduceRight((elseValue, conditionalCase) => {
            return createNOp([conditionalCase.condition, conditionalCase.value, elseValue], "conditional", defaultState)
        }, defaultCase[2])
    }

ConditionalCase "conditional case"
    = "\n""    "* "if" _ condition:Or _ "then" _ value:Expression _ Comment? {
        return {condition, value}
    }

Or "or"
	= left:And _ op:"||" _ right:Or { return createNOp([left, right], "or")}
    / And
And "and"
	= left:Equal _ op:"&&" _ right:And { return createNOp([left, right], "and")}
    / Equal
Equal "equality"
	=  left:Sum _ op:("<"/">"/"==") _ right:Equal { return createNOp([left, right], symbolTable[op])}
    / Sum
Sum "sum"
	= left:Product _ op:("+"/"-") _ right:Sum { return createNOp([left, right], symbolTable[op])}
    /Product
Product "product"
	= left:Not _ op:("*"/"/") _ right:Product { return createNOp([left, right], symbolTable[op])}
    / Not

Not "not"
    ="!"value:Not {return createNOp([value], "not")}
    / ComputedMemberAccess

ComputedMemberAccess "computed member access"
    = iterator: Value"[" key:Expression "]" {
        return createNOp([iterator, key], "index")
    }
    / Apply / GroupedExpression
    
GroupedExpression "grouped expression"
    = "("expr:Expression")"{
        return expr
    }
    / Value
    
Value "value"
	=  Primitive / Bool / Number / String / Get / Object / Name

Apply "function application"
	= name:Name "("arg0:Expression args:("," _ Expression)*")"{
        const argsList = args.map((arg) => (arg[2]))
        return createNOp([arg0].concat(argsList), name)
    }

Name "name"
	= name:[a-zA-Z0-9]+ {return name.join("")}

New = "new "name:Name _ Comment? {return name}

Search = query:Name {
	return {
            lynxIR:{type:"search", "query":query}
        }
    }

////////references
Get "get"
    = root:Search? attributes:("."Name)+ {
    return attributes.reduce(buildPath, root)
}
     
////////primitives
Number 
	= value:(Float / Int) {
        return {
            lynxIR:{type:"number", value: value},
            jsRep:value,
            //definition: createDef(value.toString())
        }
    }
    
Int "int"
	= negative:"-"? digits:[0-9]+ {
    	return parseInt(negative+digits.join(""))
     }

Float "number"
  = left:[0-9]+ "." right:[0-9]+ {
        return parseFloat(left.join("") + "." +   right.join(""))
    }

String "string"
     = '"'characters:[^\0-\x1F\x22\x5C]*'"' {
         var value = characters.join("")
         return createString(value)//Object.assign(createString(value), {definition: createDef(value)})
     }

ArrayElement "array element"
	= Object / Expression
    
Array "array"
    = SingleLineArray / MultilineArray
    
SingleLineArray "single line array"
    ='['_ head:ArrayElement* tail:(','_ ArrayElement)*']' {
    	var remaining = tail.map(function(expr){return expr[2]})
    	return createArray([head].concat(remaining))
    }
MultilineArray "multi line array"
    ='['"{#{\n""    "* head:ArrayElement tail:('\n' '    '*ArrayElement)*'}#}\n''    '*']'{
        var remaining = tail.map(function(expr){return expr[2]})
        return createArray([head].concat(remaining))
    }

Map "map"
    = '{'_ firstKey:ArrayElement ':'_ firstValue:ArrayElement _"}"

Bool "bool"
    = value:("true" / "false") {
    return {
        	lynxIR: {type:"bool", value:value==="true"},
            //definition: createDef(value)
       }
    }
Primitive "static primitive"
    ="{"type:Name"}" {return {type:type}}
//whitespace
_ = " "*

//comment
Comment "comment"
	="//"[^\n]*

BlockComment "block comment"
    ="/*" (!"*/" .)* "*/"