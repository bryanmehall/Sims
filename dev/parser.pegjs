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
        name: {jsRep:"string", lynxIR:{value:"string"}},//todo: clean this up -- remove lynxIR and just use jsRep?
        //creates infinite loop where instanceOf:createLocalSearch("string"),
        equalTo:createLocalSearch("string"),
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
        function:op,
        instanceOf:"apply"
    }
    if (typeof defaultState !== 'undefined' && defaultState !== ""){
        applyObject.defaultState = defaultState
    }
    args.forEach((arg, i) => {
        applyObject["op"+(i+1)] = arg
    })
    return applyObject
}

function createFunction(name){
	return {
        	name:createString(name),
        	lynxIR:{type:"function"}
    }
}
function createArray(elementValues){
    return {
        instanceOf:"array",
        jsRep:elementValues,
        name:createString("array"),
        equalTo: createLocalSearch("array")
    }
}
function createLocalSearch(query){
    return {
        lynxIR:{type:"search", "query":query}
    }
}

function buildPath(rootObject, attr, str){
    var getData = {
        lynxIR:{type:"get"},
        instanceOf:"get",
        attribute:attr
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

New = "new "name:Name _ Comment? {return name}

Name "name"
	= name:[a-zA-Z0-9]+ {return name.join("")}

Attribute 
    = name:Name":"" "? value:(Expression) _ Comment? {
        return {
        	name:name,
            value:value
       }
   }

Expression "expression"
	=  Conditional / Array / Or

 //#####################  conditionals  ########################
Conditional "conditional"
    =  condition:Or _ "?"_ then:Expression _":"_ alt:Expression {
    return createNOp([condition, then, alt], "conditional")
    }
    / MultilineConditional

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

DefaultState "defaultState"
    = "("defaultState:Expression")" {return defaultState}


//#########################  operators  ######################
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
    / GroupedExpression  //ComputedMemberAccess

/*ComputedMemberAccess "computed member access"
    = iterator: Value"[" key:Expression "]" {
        return createNOp([iterator, key], "getIndex")
    }
    / GroupedExpression*/
    
GroupedExpression "grouped expression"
    = "("expr:Expression")"{
        return expr
    }
    / Apply / Value
    
Value "value"
	=  Primitive / Bool / Number / String / Object / Get / Search

Apply "function application"
	= search:(Search ) "("arg0:Expression args:("," _ Expression)*")"{
        const argsList = args.map((arg) => (arg[2]))
        return createNOp([arg0].concat(argsList), search)
    }

//###########################  references ############################
GlobalSearch "global search"
    = "\\"name:Name {return name}

LocalSearch "local search"
    = query:Name {
	return createLocalSearch(query)
    }

Search "search" 
    = LocalSearch / GlobalSearch

GetIndex "get index"
    = "[" key:Expression "]" { return key }

GetAttr "get attribute"
    = "."attr:Name { return attr }

Get "get"
    = root:Search? attributes:(GetAttr / GetIndex)+ {
    return attributes.reduce(buildPath, root)
    }
     
//#########################  primitives  ################################
Number "number"
	= value:(Float / Int) {
        return {
            instanceOf:"number",
            name:createString("number"),
            lynxIR:{type:"number", value: value},
            jsRep:value,
            equalTo: createLocalSearch("number"),
            definition: createDef(value.toString())
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

Bool "bool"
    = value:("true" / "false") {
    var value = value==="true"
    return {
        	lynxIR: {type:"bool", value:value},
            jsRep:value,
            name:createString("bool"),
            equalTo: createLocalSearch("bool"),
            definition: createDef(value)
       }
    }

Primitive "static primitive"
    ="{"type:Name args:ArgsList?"}" {return {type:type, args:args}}

//########################### arrays  ##############################
ArrayElement "array element"
	= Object / Expression
    
Array "array"
    = SingleLineArray / MultilineArray
    
SingleLineArray "single line array"
    ='['_ head:ArrayElement* tail:(','_ ArrayElement)*']' {
    	var remaining = tail.map(function(expr){return expr[2]})
    	return createArray(head.concat(remaining))
    }
MultilineArray "multi line array"
    ='['"{#{\n""    "* head:ArrayElement tail:('\n' '    '*ArrayElement)*'}#}\n''    '*']'{
        var remaining = tail.map(function(expr){return expr[2]})
        return createArray([head].concat(remaining))
    }
ArgsList = ", ["firstArg:Name args:(", "Name)*"]" {
	var argList = args.map(function(arg) {return arg[1]})
	return [firstArg].concat(argList)
    }

Map "map"
    = '{'_ firstKey:ArrayElement ':'_ firstValue:ArrayElement _"}"



//######################  whitespace  ##########################
_ = " "*

//#######################  comments  ###########################
Comment "comment"
	="//"[^\n]*

BlockComment "block comment"
    ="/*" (!"*/" .)* "*/"