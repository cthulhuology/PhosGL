// phosphor.js
//
// Copyright (C) 2009 David J. Goehrig
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
////////////////////////////////////////////////////////////////////////////////////////////////////
// Object Extensions
Object.prototype.functionalize = function(i) {
	var str = (("" + this).split("\n")).join(" "); // Remove \n from defs
	var re = /^[^{]+{(.*)}$/;
	var m = re.exec(str);
	if (m) return m[1];
	return "" + this;
}
Object.prototype.parameterize = function() {
	var str = "" + this;
	var re = /function (\([^)]*\))/;
	var m = re.exec(str);
	if (m) return m[1];
	return "";
}
Object.prototype.property = function(c,k,x,y) {
	var t = Text.init(this).at(x,y).by(200,20);
	t.childof = c;
	t.valueof = k.deparameterized();
	return [ t ];
}
Object.prototype.display = function(x,y) {
	var a = [];
	var $self = this;
	this.each(function(v,k) {
		if (!k || !v) return;
		var t = v.parameterize ? 
			Text.init(k + v.parameterize()).at(x,y).by(200,20):
			Text.init(k).at(x,y).by(200,20);
		t.childof = $self;
		y += 28;
		a.push(t);
	});
	return a;
}
String.prototype.deparameterized = function() {
	var re = /(\w+)\(/;
	var m = re.exec(this);
	if (m) return m[1];
	return this;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Array Extensions
Array.prototype.collapse = function() { 
	this.every(function(o,i) { 
		if (o.expanded) o.expanded = o.expanded.collapse();
		o.free();
	})
	return false
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Sound Object
var Sound = let(Resource,{
	init: function(name) {
		var s = this.clone();
		s.load('audio',name);
		return s;
	},
	play: function() { this.data.play(); return this },
	pause: function() { this.data.pause(); return this },
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Text Object
var Text = let(Widget,{
	bg: "gray",
	moving: false,
	editing: false,
	expanded: false,
	content: false,
	init: function(txt) { 
		var t = Text.clone();
		t.content = txt 
		return t.instance();
	},
	evaluate: function() {
		if (!this.content) return "";
		var retval = this.content
		try { 
			retval = eval( '(' + this.content + ')') 
			Sound.click.play();
		} catch(e) { 
			try {
 				retval = eval( this.content );
 				Sound.click.play();
 			} catch(ee) {
 				Sound.error.play();
 				alert(e); 
 			}
		};
		return retval;
	},
	press: function(e) {
		if (!this.editing) return;
		this.content =  e.key == Keyboard.enter && this.childof && this.valueof ? 
			this.childof[this.valueof] = this.evaluate():
			e.key == Keyboard.enter ? this.evaluate():
			e.key == Keyboard.backspace ? 
			this.content.length == 0 || Keyboard.shift ? this.done() :
			this.content.substring(0,this.content.length-1):
			this.content + e.key;
	},
	done: function() {
		Sound.click.play();
		if (this.expanded) this.expanded = this.expanded.collapse();
		this.free();
	},
	expand: function() {
		if (this.valueof) {
			var text  = Text.init(this.childof[this.valueof]).at(this.x+this.w+2,this.y).by(200,20);
			text.expanded = text.expand();
			return false;
		}
		return this.childof ?  
			this.childof[this.content.deparameterized()].property(this.childof,this.content,this.x+this.w+2,this.y):
			this.evaluate().display(this.x,this.y+this.h+4);

	},
	draw: function() {
		if (!this.visible) return;
		Screen[this.editing ? 'white' : 'gray']();
		if (!this.editing && this.childof && this.valueof) this.content = this.childof[this.valueof];
		Screen.at(this.x,this.y+Screen.size).by(this.w-Screen.size,this.h).font('16 Arial').print(this.content);
		this.by(Math.max(this.w,(Screen.x+Display.x)-this.x + Screen.size),(Screen.y+Display.y)-this.y + Screen.size/2);
		Screen.at(this.x-Screen.size/2,this.y).by(this.w,this.h).frame();
	},
	down: function(e) { 
		if (this.hit(e)) {
			this.moving = e 
			if (!this.content) return;
			if (e.button > 1) {
				Sound.click.play();
				this.expanded = this.expanded ?
					this.expanded.collapse():
					this.expand();
			}
		}
	},
	up: function(e) { 
		var o = false;
		var $self = this;
		if (this.moving && (o = App.widgets.any(function(v,k) {
			return ![ $self, Display, Phosphor ].has(v) 
					&& v.can('hit') && v.hit($self) && v.editing }))) {
			if (o.childof && !o.valueof) {
				o.childof[o.content.deparameterized()] = this.evaluate();
				this.free();
			} else if (!o.childof) {
				o.evaluate()[this.content] = true;	
				if (o.expanded) o.expanded.collapse();
				o.expanded = o.expand();
				this.free();
			}
		}
		this.moving = false;
	},
	move: function(e) { 
		this.editing = this.hit(e);
		if (this.moving) {
			var dx = e.x - this.moving.x;
			var dy = e.y - this.moving.y;
			this.to(e.x - this.moving.x,e.y -this.moving.y );
			if (this.expanded) this.expanded.every(function(o,i) { 
				if (o.expanded) o.expanded.every(function(m,i) { m.to(dx,dy)});
				o.to(dx,dy)});
			this.moving = e;
		}
	},
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Image Object
var Image = let(Widget,Resource, {
	init: function(name) {
		var i = this.clone();
		i.load('img',name);
		i.at(0,0).by(i.w,i.h);
		return i.instance();
	},
	draw: function() { Screen.at(this.x,this.y).by(this.w,this.h).draw(this) },
	down: function(e) { if (this.hit(e)) this.moving = e },
	up: function(e) { this.moving = false },
	move: function(e) { 
		if (this.moving) { 
			this.to(e.x-this.moving.x,e.y-this.moving.y);
			this.moving = e;
		}
	},
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Movie Object
var Movie = let(Widget,Resource,{ 
	div: $_('div'),
	init: function(name) {
		var i = this.clone();
		i.attached = false;
		i.load('video',name,function($self) {
			if ($self.attached) return;
			$self.attached = true;
			$self.div = $_('div');
			$self.data.autobuffer = true;
			$self.data.autoplay = false;
			$self.div.style.position = 'absolute';
			$self.div.style.display = "block";
			$self.div.style.zIndex = 2;
			$self.div.add($self.data);
			_body.add($self.div);
			$('canvas').style.zIndex = 1;
		});
		return i.instance();
	},
	draw: function() {
		this.div.style.display = this.visible ? "inline" : "none";
		this.div.style.width = this.w;
		this.div.style.height = this.h;
		this.clamp(0,0,Display.w,Display.h);
		this.div.style.top = this.y;
		this.div.style.left = this.x;
	},
	play: function() { 
		if (this.data.readyState != 4) return this;
		this.data.play(); 
		return this;
	},
	pause: function() { this.data.pause(); return this },
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Phosphor Environment
var Phosphor = let(Widget,{
	init: function() {
		Sound.error = Sound.init('sounds/error.wav');
		Sound.click = Sound.init('sounds/click.wav');
		this.at(0,Display.h-64).by(Display.w,64);
		this.help = Help.init('images/help_button.png').at(Display.w-100,0);
		return this.instance();
	},
	draw: function() {if (!this.visible) return },
	move: function(e) { },
	down: function(e) {
		if (App.widgets.any(function(o) {
			if ( !o.can('hit') || o == Phosphor || o == Display) return false;
			return o.hit(e);
		})) return;
		if (e.button == 2) { // Right Click to add a text block
			Sound.click.play();
			var t = Text.init('');
			t.at(e.x,e.y).by(100,24);
		}
	},
});
////////////////////////////////////////////////////////////////////////////////////////////////////
// Help Object
var Help = let(Image,{
	down: function(e) {
		if (!this.hit(e) || this.blurb) return;
		Sound.click.play();
		this.blurb = Image.init('images/help.png');
		this.blurb.down = function(e) { 
			if(this.hit(e)) { 
				Sound.click.play();
				Phosphor.help.blurb = false;
				this.free();
			}
		};
	}
});
////////////////////////////////////////////////////////////////////////////////////////////////////
// End
