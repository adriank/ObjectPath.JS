// ObjectPath parser function
// Adrian Kalbarczyk
// 2012

// This file extensively uses the work of Douglas Crockford:
// Parser for Simplified JavaScript written in Simplified JavaScript
// From Top Down Operator Precedence
// http://javascript.crockford.com/tdop/index.html
// Douglas Crockford
// 2010-06-26

var makeTree=function() {
	var D=false
	if (this)
		D=this.D
	var symbol_table = {};
	var token;
	var tokens;
	var token_nr;
	var TRUE=["true","t"],
			FALSE=["false","f"],
			NULL=["none","null","n","nil"]

	var itself = function () {
		return this;
	};

	var advance = function (id) {
		var D=self.D
		var a, o, t, v;
		if (D) console.log("{fn:advance("+(typeof(id)!=='undefined'?id:"")+")")
		if (id && token.id !== id) {
			token.error("Expected '" + id + "', got '"+token.id+"'.");
		}
		if (token_nr >= tokens.length) {
			token = symbol_table["(end)"];
			return;
		}
		t = tokens[token_nr];
		token_nr += 1;
		v = t.value;
		a = t.type;
		if (D) console.log("token is '",v,"', type: '",a,"'")
		if (a === "name") {
			if (FALSE.indexOf(v.toLowerCase())>=0) v="false"
			if (TRUE.indexOf(v.toLowerCase())>=0) v="true"
			if (NULL.indexOf(v.toLowerCase())>=0) v="null"
			o = symbol_table[v];
			if (!o){
				o=symbol_table["(name)"]
			}
		} else if (a === "(root)") {
			o=symbol_table["(root)"]
		} else if (a === "(current)") {
			o=symbol_table["(current)"]
		} else if (a === "(context)") {
			o=symbol_table["(context)"]
		} else if (a === "op") {
			if (D) console.log("operator",v,"found")
			o = symbol_table[v];
			if (!o) {
				t.error("Unknown operator.");
			}
		} else if (a === "str" || a === "number") {
			if (D) console.log(a,v," found")
			o = symbol_table["(literal)"];
			a = "literal";
		} else {
			t.error("Unexpected token.");
		}
		token = Object.create(o);
		token.position  = t.position;
		token.value = v;
		token.arity = a;
		token.error = function(e){
			console.error(e)
		}
		if (D) console.log("}fn:advance() returning token: ",token)
		return token;
	};

	var expression = function (rbp) {
		var D=this.D
		if (D) console.log("{fn:expression("+(typeof(rbp)!=='undefined'?rbp:"")+")")
		var left;
		var t = token;
		rbp=typeof rbp==="undefined"?0:rbp
		advance();
		if (D) console.log("token is",t)
		left = t.nud();
		if (D) console.log("left is: ",left)
		if (D) console.log("while",rbp,"<",token.lbp)
		while (rbp < token.lbp) {
			if (D) console.log("in while loop token:",token)
			t = token;
			advance();
			left = t.led(left);
			if (D) console.log("left is ",left)
		}
		if (D) console.log("}fn:expression() returning token: ",left)
		return left;
	};

	var block = function () {
		if (this.D) console.log("fn:block()")
		var t = token;
		advance("{");
		return t.std();
	};

	var original_symbol = {
		nud: function () {
			this.error("Undefined nud().");
		},
		led: function (left) {
			this.error("Missing operator.");
		}
	};

	var symbol = function (id, bp) {
		var D=this.D
		if (D) console.log("{fn:symbol("+id,", "+bp+")")
		var s = symbol_table[id];
		bp = bp || 0;
		if (s) {
			if (bp >= s.lbp) {
				s.lbp = bp;
			}
		} else {
			s = Object.create(original_symbol);
			s.id = s.value = id;
			s.lbp = bp;
			symbol_table[id] = s;
		}
		if (D) console.log("}fn:symbol() returning: ",s)
	 return s;
	};

	var constant = function (s, v) {
		var x = symbol(s);
		x.nud = function () {
			this.value = symbol_table[this.id].value;
			this.arity = "literal";
			this.id = "(literal)";
			return this;
		};
		x.value = v;
		//if (D) console.log("constant is ",x)
		return x;
	};

	var infix = function (id, bp, led) {
		var s = symbol(id, bp);
		s.led = led || function (left) {
			this.first = left;
			this.second = expression(bp);
			this.arity = "binary";
			return this;
		};
		return s;
	};

	var infixr = function (id, bp, led) {
		var s = symbol(id, bp);
		s.led = led || function (left) {
			this.first = left;
			this.second = expression(bp - 1);
			this.arity = "binary";
			return this;
		};
		return s;
	};

	var assignment = function (id) {
		return infixr(id, 10, function (left) {
			if (left.id !== "." && left.id !== "[" && left.arity !== "name") {
					left.error("Bad lvalue.");
			}
			this.first = left;
			this.second = expression(9);
			this.assignment = true;
			this.arity = "binary";
			return this;
		});
	};

	var prefix = function (id, bp, nud) {
		var s = symbol(id);
		s.nud = nud || function () {
			this.first = expression(bp);
			this.arity = "unary";
			return this;
		};
		return s;
	};

	var pathLed=function(left){
		this.first=left
		if (["(name)","*"].indexOf(token.id)<0)
			SyntaxError("Expected an attribute name.")
		if (token.id==="*")
			token.arity="wildcard"
		this.second=token
		advance()
		return this
	}

	//var stmt = function (s, f) {
	//	var x = symbol(s);
	//	x.std = f;
	//	return x;
	//};

	symbol("(end)");
	symbol("(name)").nud=itself
	symbol("(literal)").nud = itself;
	symbol("(root)").nud=itself
	symbol("(current)").nud=itself
	symbol("(context)").nud=itself
	symbol(":");
	//symbol(";");
	symbol(",");

	constant("true", true);
	constant("false", false);
	constant("null", null);
	//constant("pi", 3.141592653589793);
	//constant("Object", {});
	//constant("Array", []);

	infixr("or", 30);
	infixr("and", 40);
	prefix("not", 50);
	infix(":",120);
	infix("in", 60); infix("not in", 60)
	infix("is", 60); infix("is not",60)
	infix("<", 60); infix("<=", 60)
	infix(">", 60); infix(">=", 60)
	infix("+", 110); infix("-", 110)
	infix("*", 120); infix("/", 120)
	infix("%", 120)
	prefix("-", 130); prefix("+", 130);
	symbol(".",150).led=pathLed
	symbol("..",150).led=pathLed

	symbol("]")
	infix("[", 150, function (left) {
		this.first = left;
		this.second = expression(0);
		this.arity = "binary";
		advance("]");
		return this;
	});

	symbol("[").led=function(left){
		if (D) console.log("symbol([), left:",left)
		this.first=left
		this.second=expression()
		advance("]")
		return this
	}

	// arrays like [1,2,3,4]
	symbol("[").nud=function () {
		var a = [];
		if (token.id !== "]") {
			while (true) {
				a.push(expression());
				if (token.id !== ",") {
						break;
				}
				advance(",");
			}
		}
		advance("]");
		this.first = a;
		this.arity = "unary";
		return this;
	}

	symbol(")");

	//this is for built-in functions
	symbol("(",150).led=function (left) {
		var a = [];
		this.arity = "binary";
		this.id="fn"
		this.first = left.value;
		if (token.id !== ")") {
			while (true) {
				a.push(expression());
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance(")");
		this.second=a
		return this;
	}

	symbol("(", 150).nud=function () {
		var e = expression();
		advance(")");
		return e;
	}

	symbol("}");
	symbol("{").nud=function () {
		var a = [], key, v;
		if (token.id !== "}") {
			while (true) {
				key = expression();
				advance(":");
				v = expression();
				v.key = key;
				a.push(v);
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance("}");
		this.first = a;
		this.arity = "unary";
		return this;
	};

	return function (arg,conf) {
		var D=this.D=conf && conf["debug"] || false
		if (D) console.log("{fn:make_parse(",typeof(arg)!=='undefined'?arg:"",")")
		if (typeof arg==="string")
			tokens = arg.tokens(D);
		else
			tokens=arg
		if (D) console.log("tokens are: ",tokens)
		token_nr = 0;
		advance();
		var s = expression();
		advance("(end)");
		if (D) console.log("}fn:make_parse() returning ",s)
		return s;
	};
};
//D=true
var parse=makeTree()
//console.log(parse("$..*[@._id>2]"))
