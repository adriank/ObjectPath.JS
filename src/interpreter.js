var ObjectPath=function(data,cfg){
	this.exprCache=[]
	this._init_(data,cfg)
	return this
}

ObjectPath.prototype={
	D:false,
	current:null,
	data:null,
	SELECTOR_OPS:["is",">","<","is not",">=","<=","in","not in",":","and","or"],
	simpleTypes:["string","number"],
	_init_:function(obj,cfg){
		this.setData(obj)
		if (cfg){
			this.setDebug(cfg["debug"] || this.D)
		}
	},
	setCurrent:function(c){
		this.current=c
	},
	resetCurrent:function(){
		this.current=null
	},
	setContext:function(c){
		this.context=c
	},
	compile:function(expr){
		if (this.exprCache.hasOwnProperty(expr))
			return this.exprCache[expr]
		var ret=this.exprCache[expr]=parse.call(this,expr,{"debug":this.D})
		return ret
	},
	setData:function(data){
		if (["object","array"].indexOf(typeof data)<0){
			this.log(data+" is not object nor array! Data not changed.")
			return data
		}
		this.data=data
		return data
	},
	setDebug:function(enable){
		this.D=enable
		console.log("debugging",this.D?"enabled":"disabled")
	},
	flatten:function(fragment){
		var ret=[]
		var rec=function(frg){
			if (Array.isArray(frg)){
				for (var i=0;i<frg.length;i++){
					rec(frg[i])
				}
			} else if (typeof frg==="object"){
				ret.push(frg)
				for (i in frg){
					rec(frg[i])
				}
			}
		}
		rec(fragment)
		return ret
	},
	execute:function(expr){
		var self=this,
				flatten=this.flatten,
				simpleTypes=this.simpleTypes,
				tree
		var exe=function(node){
			var D=self.D
			if (D) console.log("executing node", node)
			if (Array.isArray(node)) {
				var a=[]
				for (var i=0;i<node.length;i++){
					a.push(exe(node[i]))
				}
				return a
			}
			var op=node.id
			if (["+","-","*","%","/",">",">=","<","<=","in","not in","is","is not"].indexOf(node.id)>=0){
				var first=typeof node.first==="object" && node.first["id"]?exe(node.first):null,
						second=typeof node.second==="object" && node.second["id"]?exe(node.second):null,
						typeFirst=typeof first,
						typeSecond=typeof second
			}
			switch (op){
				case "(literal)": {
					if (D) console.log("op "+op+" found")
					return node.value
				}
				case "+":{
					if (D) console.log("op "+op+" found; first is",first,"second is",second)
					//if (D) console.log(typeFirst)
					if (typeFirst==='number' && typeSecond!=="number")
						second=parseInt(second)
					else if (Array.isArray(first)){
						if (Array.isArray(second)){
							return first.concat(second)
						} else {
							first.push(second)
						}
					}
					if (D) console.log("returning",first+second)
					return first+second
				}
				case "-":{
					if (D) console.log("op "+op+" found; returning: ",first-second)
					if (!second)
						return -first
					return first-second
				}
				case "*":{
					if (node.arity!="wildcard"){
						if (D) console.log("op "+op+" found; returning: ",first*second)
						return first*second
					}
					else{
						//TODO this is executed only because precomputation of first
						//if (D) console.log("wildcard "+op+" found; returning: ",node.first)
						return null
					}
				}
				case "%":{
					if (D) console.log("op "+op+" found; returning: ",first%second)
					return first%second
				}
				case "/":{
					if (D) console.log("op "+op+" found; returning: ",first/second)
					return first/second
				}
				case ">":{
					if (D) console.log("op "+op+" found; returning: ",first>second)
					return first>second
				}
				case "<":{
					return first<second
				}
				case ">=":{
					return first>=second
				}
				case "<=":{
					return first<=second
				}
				case "not":{
					return !exe(node.first)
				}
				case "or":{
					return exe(node.first) || exe(node.second)
				}
				case "and":{
					return exe(node.first) && exe(node.second)
				}
				case "in":
				case "not in":{
					if (D) console.log("op "+op+" found; doing",first,op,second)
					var ret=null
					if (typeSecond==="string")
						ret=second.search(first.toString())>=0
					else if (Array.isArray(second)){
						ret=second.indexOf(first)>=0
					} else if (typeSecond==="object")
						ret=second.hasOwnProperty(first)
					return op==="in"?ret:!ret
				}
				case "is":
				case "is not":{
					var ret=null
					if (D) console.log("op '"+op+"' found; doing",first,op,second)
					if (simpleTypes.indexOf(typeFirst)>=0){
						if (D) console.log("doing simple type comparison:",first,"is",second," = ",(first==second))
						ret=first==second
					}
					else if (typeFirst==="array" || typeFirst==="object"){
						//TODO needs(!) better algorithm
						if (D) console.log("doing JSON comparison: ",first," is ",second)
						try{
							ret=JSON.stringify(first)==JSON.stringify(second)
							throw {
								name:"comparison Error",
								message: "JSONStringifyNotAvailable. Your web browser doesn't support JSON.stringify(). Vote for support at"
							}
						} catch(e){}
					}
					return op==="is"?ret:!ret
				}
				case "(root)":{// self is $
					if (D) console.log("op "+op+" found; returning with: ",self.data)
					return self.data
				}
				case "(current)":{// self is @
					if (D) console.log("op "+op+" found; returning with: ",self.current)
					return self.current
				}
				case "(context)":{// self is @
					if (D) console.log("op "+op+" found; returning with: ",self.context)
					return self.context
				}
				case ":":{
					return node
				}
				case "(name)":{
					return node.value
				}
				case "[":{
					if (node.arity==="unary"){
						if (D) console.log("array found")
						//console.log(node)
						var r=[]
						for (i in node.first){
							r.push(exe(node.first[i]))
						}
						if (D) console.log("returning",r)
						return r
					} else if (node.arity==="op"){
						if (D) console.log("selector found with op "+node.second.id)
						var first=exe(node.first)
						if (!first)
							return first
						if (Array.isArray(first)){
							var second=exe(node.second),
									typeSecond=typeof second
							if (second && second.id===":") {
							if (D) console.log("slice operator found")
								//var [s,f]=[exe(second.first),exe(second.second)]
								return first.slice(exe(second.first),exe(second.second))
							}
							if (D) console.log("left is",first,"right is",second)
							if (typeSecond==="number"){
								if (second===-1) {
									return first.slice(-1)[0]
								} else if (second<0) {
									return first.slice(second,second+1)[0]
								}
								return first[second]
							} else if (typeSecond==="string"){
								var r=[]
								for (var i=0;i<first.length;i++){
									if (first[i][second])
										r.push(first[i][second])
								}
								if (D) console.log("returning",r)
								return r
							} else if (typeof node.second==="object" && self.SELECTOR_OPS.indexOf(node.second.id)>=0){
								var selector=node.second
								if (D) console.log("found ",selector.id," operator in selector")
								var r=[],
										o=Object.create(selector)
								for (i in first){
									var fst=first[i]
									self.current=fst
									o.first=fst
									if (exe(o))
										r.push(fst)
								}
								return r
							}
							programmingError("left is array and right is not number")
						} else if (typeFirst==="object"){
							if (D) console.log("left is"+first+"right is",second)
							if (node.second.id==="(name)" || typeSecond==="string"){
								if (D) console.log("returning ",first,second,first[second])
									return first[second]
							}
						}
						return 1
					}
					return null
				}
				case "(":{
					if (D) console.log("first is: ",node.first.value)
					switch (node.first.value) {
						case "str":{
							var snd=exe(node.second)
							if (D) console.log("second is: ",snd)
							if (typeof snd==="object") {
								return JSON.stringify(snd)
							}else{
								return snd.toString
							}
						}
					}
					return null
				}
				case "{":
				case "":{
					throw {
						error:"NotImplementedYet",
						message:op+" is not implemented yet!",
						data:node
					}
				}
				case "..":{
					first=flatten(exe(node.first))
				}
				case ".":{
					var first=first || exe(node.first)
					if (D) console.log("op "+op+" found")
					if (node.second.id==="*"){
						if (D) console.log("wildcard (*) found; returning",first)
						//return Array.isArray(first) && first || [first]
						return first
					} else if (first){
						if (Array.isArray(first)){
							var r=[]
							var second=exe(node.second)
							for (var i=0;i<first.length;i++){
								if (first[i][second])
								 	r.push(first[i][second])
							}
							if (D) console.log("returning",r)
							return r
						}
						return first[node.second.value]
					} else {
						return null
					}
				}
				case "fn":{
					switch (node.first) {
						//String functions
						case "replace":{
							var r=exe(node.second)
							if (r[0]) {
								return r[0].replace(new RegExp(r[1] ,"g"),r[2])
							}
							return ""
						}
						case "split":{
							var r=exe(node.second)
							if (r[0]) {
								return r[0].split(r[1])
							}
							return ""
						}
						// array functions
						case "max":{
							return Math.max.apply(null, exe(node.second)[0])
						}
						case "min":{
							return Math.min.apply(null, exe(node.second)[0])
						}
					}
				}
				throw {
					"error":"WrongFunction",
					"message":"Function "+op+" is not proper ObjectPath function.",
					"data":node
				}

			}
			throw {
				"error":"WrongOperator",
				"message":"Operator "+op+" is not proper ObjectPath operator.",
				"data":node
			}
		}
		if (!expr) {
			return expr
		}
		if (this.D) console.log("{OP:execute(",expr,")")
		if (typeof expr==="string")
			tree=this.compile(expr)
		if (this.D) console.log("tree is",tree)
		//try{
			var ret=exe(tree)
		//}catch(e){
			//console.info("no data found in", expr, JSON.stringify(e,null,2))
		//}
		if (this.D) console.log("}OP:execute with:", ret)
		return ret
	}
}
