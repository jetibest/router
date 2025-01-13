// version 2024-07-21

(function(root)
{
	function hash(keyString)
	{
  		let hash = 0;
  		for (charIndex = 0; charIndex < keyString.length; ++charIndex)
  		{
    		hash += keyString.charCodeAt(charIndex);
    		hash += hash << 10;
    		hash ^= hash >> 6;
  		}
  		hash += hash << 3;
  		hash ^= hash >> 11;
  		//4,294,967,295 is FFFFFFFF, the maximum 32 bit unsigned integer value, used here as a mask.
  		return (((hash + (hash << 15)) & 4294967295) >>> 0).toString(16)
	}
	var flatten = (arr) =>
	{
		var newArray = [];
		for(var i=0;i<arr.length;++i)
		{
			var v = arr[i];
			if(Array.isArray(v))
			{
				if(v.length)
				{
					newArray = newArray.concat(flatten(v));
				} // else: ignore empty arrays
			}
			else
			{
				newArray.push(v);
			}
		}
		return newArray;
	};
	var merge = (a, b) =>
	{
		if(!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b))
		{
			return a = b;
		}
		for(var k in b)
		{
			if(Object.prototype.hasOwnProperty.call(b, k))
			{
				if(typeof a[k] === 'object' && typeof b[k] === 'object' && !(Array.isArray(a[k]) || Array.isArray(b[k])))
				{
					merge(a[k], b[k]);
				}
				else
				{
					a[k] = b[k];
				}
			}
		}
		return a;
	};
	// matches if arg is equal to obj
	// arg=null is a wildcard, empty objects like [] and {} will also match any value of the same type
	function match_objects(obj, arg)
	{
		if(arg === null)
		{
			return true;
		}
		else if(typeof arg === 'object')
		{
			if(Array.isArray(arg))
			{
				if(!Array.isArray(obj))
				{
					for(var j=0;j<arg.length;++j)
					{
						if(!match_objects(obj, arg[j]))
						{
							return false;
						}
					}
					return true;
				}
				else if(arg.length > 0 && arg.length !== obj.length)
				{
					return false;
				}
				else
				{
					for(var j=0;j<arg.length && j<obj.length;++j)
					{
						if(!match_objects(obj[j], arg[j]))
						{
							return false;
						}
					}
					return true;
				}
			}
			else if(typeof obj !== 'object' || Array.isArray(obj))
			{
				return false;
			}
			else
			{
				for(var k in arg)
				{
					if(Object.prototype.hasOwnProperty.call(arg, k))
					{
						if(Object.prototype.hasOwnProperty.call(obj, k))
						{
							if(!match_objects(obj[k], arg[k]))
							{
								return false;
							}
						}
						else
						{
							return false;
						}
					}
				}
				return true;
			}
		}
		else
		{
			return obj === arg;
		}
	}
	var handleResult = function(result, container, append)
	{
		var components = [];
		if(result !== null && typeof result === 'object' && result.type === 'htmlElementComponent')
		{
			result.render(container, append);
			components.push(result);
		}
		else if(typeof result === 'string' || typeof result === 'number' || (typeof result === 'object' && result != null))
		{
			if(Array.isArray(result))
			{
				for(var i=0;i<result.length;++i)
				{
					components.push(handleResult(result[i], container, append));
				}
			}
			else
			{
				var span = html.createElement('span', {innerText: result});
				span.render(container, append);
				components.push(span);
			}
		}
		return flatten(components);
	};
	var cachedStyleTag;
	return (root || {}).html = {
		svg: {
			$: (function(arr) // shortcuts for commonly used svg-elements
			{
				var map = {};
				for(var i=0;i<arr.length;++i)
				{
					(function(v)
					{
						map[v] = function()
						{
							return html.svg.createElement.apply(null, [v].concat(Array.from(arguments)));
						};
					})(arr[i]);
				}
				return map;
			})(['svg', 'use']),
			createElement: function()
			{
				return html.createElementNS.apply(null, ['http://www.w3.org/2000/svg'].concat(Array.from(arguments)));
			}
		},
		$: merge((function(arr) // shortcuts for commonly used html-elements
		{
			var map = {};
			for(var i=0;i<arr.length;++i)
			{
				(function(v)
				{
					map[v] = function()
					{
						return html.createElement.apply(null, [v].concat(Array.from(arguments)));
					};
				})(arr[i]);
			}
			return map;
		})(['div', 'span', 'ul', 'li', 'dl', 'dt', 'dd', 'input', 'textarea', 'button', 'label', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'th', 'td', 'caption', 'header', 'footer', 'main', 'nav', 'br', 'hr', 'iframe', 'b', 'i', 'u', 'a', 'strong', 'link', 'script', 'style', 'title', 'html', 'body', 'head', 'article', 'aside', 'details', 'hgroup', 'section', 'summary', 'base', 'basefont', 'meta', 'datalist', 'fieldset', 'form', 'legend', 'meter', 'optgroup', 'option', 'select', 'blockquote', 'abbr', 'acronym', 'address', 'bdi', 'bdo', 'big', 'center', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'ins', 'kbd', 'mark', 'output', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'strike', 'sub', 'sup', 'tt', 'var', 'wbr', 'dir', 'menu', 'ol', 'col', 'colgroup', 'tbody', 'thead', 'tfoot', 'noscript', 'area', 'audio', 'canvas', 'embed', 'figcaption', 'figure', 'frame', 'frameset', 'iframe', 'img', 'map', 'noframes', 'object', 'param', 'source', 'time', 'video', 'svg', 'use']), {
			'precode': function()
			{
				return html.$.pre(html.$.code.apply(this, Array.from(arguments)));
			}
		}),
		version: '1.0',
		css: function(css_text, opts, opts_alt)
		{
			var priority = 1;
			
			// if first argument is a number, then this indicates the priority, the higher the number, the more priority
			if(typeof css_text === 'number')
			{
				priority = css_text;
				css_text = opts;
				opts = opts_alt;
			}
			
			// create an anonymous css class in <head> ==> <style data-html="1.0"></style>, and return its className
			if(typeof css_text === 'object')
			{
				opts = css_text;
				css_text = '';
			}
			if(typeof opts !== 'object' || opts === null) opts = {};
			if(typeof css_text !== 'string') css_text = '';
			
			var css_lines = [];
			
			if(css_text.length > 0)
			{
				if(/^\s*[&@]/g.test(css_text))
				{
					// wrap class (but not if @keyword{}, which means no className is returned as a special case, or if manually supplied &)
					
					css_lines.push(css_text.replace(/(^|\r?\n)\s*/g, ' '));
				}
				else
				{
					css_lines.push('&{' + css_text.replace(/(^|\r?\n)\s*/g, ' ') + '}');
				}
			}
			
			// add and wrap pseudo-classes
			for(var k in opts)
			{
				var v = opts[k].replace(/(^|\r?\n)\s*/g, ' ');
				var k_multi = k.split(',');
				
				for(var i=0;i<k_multi.length;++i)
				{
					var k_it = k_multi[i].replace(/^\s+/g, '').replace(/\s+$/g, ''); // trim
					var v_it = v +'';
					
					if(k_it.indexOf('@') === 0)
					{
						// special @-query detected, like: '@media screen and (max-width: 900px)': 'flex-direction: column;'
						// or we could do a @keyframes definition: '@keyframes spin': '0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}'
						
						if(v_it.indexOf('{') === -1 && v_it.indexOf('&') === -1)
						{
							v_it = '&{' + v_it + '}';
						}
					}
					else if(k_it.indexOf('&') === -1)
					{
						k_it = '&' + k_it;
					}
					
					css_lines.push(k_it + '{' + v_it + '}');
				}
			}
			
			// calculate hash, to come to unique classname
			var unique_className = 'htmljs-css-' + hash(css_lines.join('\n') + '\n');
			var unique_selector = '.' + unique_className;
			
			// apply priority to the className (just copy the selector priority times)
			while(--priority > 0)
			{
				unique_selector += '.' + unique_className;
			}
			
			// apply className
			for(var i=0;i<css_lines.length;++i)
			{
				var ln = css_lines[i];
				
				// replace first occurrence of & with the unique classname
				ln = ln.replace('&', unique_selector);
				
				// replace any subsequent occurrences of &, as long as it ended by '}', this assumes '}' cannot exist in an URL or text variable, potentially unsafe! & should not be within quotes (TODO)
				ln = ln.replace(/([}]\s*)[&]/g, ($0, $1) => $1 + unique_selector);
				
				if(ln !== css_lines[i])
				{
					css_lines[i] = ln;
				}
				else
				{
					// if no occurrence of &, still apply the hash to the line, so we can match and see if it already exists
					// this happens when @keyword is used directly
					css_lines[i] = '/* ' + unique_selector + ' */ ' + ln;
				}
			}
			
			// ensure <style> tag in <head>
			cachedStyleTag = cachedStyleTag || document.querySelector('head > style[data-html="' + this.version + '"]');
			if(!cachedStyleTag)
			{
				cachedStyleTag = document.createElement('style');
				cachedStyleTag.setAttribute('data-html', this.version);
				document.querySelector('head').appendChild(cachedStyleTag);
			}
			
			// inject and bundle css into existing <style> tag
			var css_bundle = cachedStyleTag.textContent.split('\n');
			for(var i=0;i<css_bundle.length;++i)
			{
				var line = css_bundle[i];
				
				// search for unique_selector lines
				if(line.indexOf(unique_selector) !== -1)
				{
					// remove this line from css_lines (due to the hashcode it's "guaranteed" to be the same)
					var cssLineIndex = css_lines.indexOf(line);
					if(cssLineIndex !== -1)
					{
						css_lines.splice(cssLineIndex, 1);
					}
				}
			}
			// only update if any changes exist
			if(css_lines.length > 0)
			{
				cachedStyleTag.textContent = css_bundle.concat(css_lines).join('\n') + '\n';
			}
			
			// return without leading dot
			return unique_className;
		},
		id: function(id) // get html-element by id
		{
			return document.getElementById(id);
		},
		eventhandlers: { // these functions can be used as event handlers ({on...: eventhandlers.function()})
			exportElementValue: function(obj, k)
			{
				if(typeof obj === 'object' && typeof k === 'string')
				{
					return function()
					{
						return obj[k] = this.element.value;
					};
				}
				else
				{
					return function(){ return this.element.value; };
				}
			}
		},
		createRenderer: function(fnc) // used by createElement, cannot be a root element, and is always embedded in a createElement, so no use of calling this directly
		{
			return {
				type: 'htmlRendererComponent',
				children: [],
				render: function(container, append)
				{
					this.children = [];
					var components = handleResult(fnc.call(container, container), container, append);
					for(var i=0;i<components.length;++i)
					{
						var c = components[i];
						this.children.push(c);
					}
				}
			};
		},
		createElementNS: function(ns, tag)
		{
			return html.createElement.apply(null, [ns + '::' + tag].concat(Array.from(arguments).slice(2)));
		},
		createElement: function(tag, options) // the main function to create nested components dynamically by javascript, see html.$ for shortcuts of this method
		{
			var children = Array.from(arguments);
			if(options === null || (typeof options === 'object' && options.type !== 'htmlElementComponent' && Object.prototype.toString.call(options) === '[object Object]'))
			{
				options = options || {};
				children = children.slice(2); // tag and options removed
			}
			else
			{
				options = {};
				children = children.slice(1); // only tag removed, no options specified
			}
			var element;
			var namespace = null;
			var nsIndex = tag.indexOf('::');
			if(nsIndex >= 0)
			{
				namespace = tag.substring(0, nsIndex);
				tag = tag.substring(nsIndex + '::'.length);
			}
			if(namespace !== null)
			{
				namespace = namespace || 'http://www.w3.org/1999/xhtml';
				element = document.createElementNS(namespace, tag);
			}
			else
			{
				element = document.createElement(tag);
			}
			var self = {
				type: 'htmlElementComponent',
				children: [],
				namespace: namespace,
				tag: tag,
				parent: null, // like parentNode
                root: null, // the first parentNode that has a $state property
				listeners: {},
				element: element
			};
			
			function _createElement()
			{
				return merge(self, {
					updateProperties: function()
					{
						// Add properties (except state)
						for(var k in options)
						{
							if(Object.prototype.hasOwnProperty.call(options, k))
							{
								var v = options[k];
								if(k === 'className' && Array.isArray(v))
								{
									v = v.join(' ');
								}
								if(/^on[a-z]+$/gi.test(k))
								{
									// event handler
									self.updateListener(k, v);
								}
								else if(/^[$]/gi.test(k))
								{
									// this is a property for the component wrapper, not the HTML element itself.. consume upon use
									if(typeof self[k] !== 'object' && self[k] !== null && !Array.isArray(self[k]))
									{
										self[k] = merge(self[k], v);
									}
									else
									{
										merge(self[k], v);
									}
									if(typeof self[k] === 'function')
									{
										self[k] = (function(fn)
										{
											// make sure context is always self (Function.bind)
											return function()
											{
												return fn.apply(self, arguments);
											};
										})(self[k]);
										
										if(k === '$init')
										{
											self[k]();
										}
									}
									delete options[k]; // consume property
								}
								else if(k === 'attributes')
								{
									if(typeof v === 'object' && v !== null)
									{
										for(var attr_key in v)
										{
											var nsIndex = attr_key.indexOf('::');
											if(nsIndex !== -1)
											{
												var ns = attr_key.substring(0, nsIndex);
												var nsk = attr_key.substring(nsIndex + '::'.length);
												
												element.setAttributeNS(ns, ns.replace(/^.*[/]/g, '') + ':' + nsk, v[attr_key]);
											}
											else if(self.namespace)
											{
												element.setAttributeNS(null, attr_key, v[attr_key]);
											}
											else
											{
												element.setAttribute(attr_key, v[attr_key]);
											}
										}
									}
								}
								else
								{
									// element[k] =  -> this won't work for attributes like element.style
									if(typeof element[k] !== 'object' && element[k] !== null && !Array.isArray(element[k]))
									{
										element[k] = merge(element[k], v);
									}
									else
									{
										merge(element[k], v);
									}
								}
							}
						}
					},
					updateState: function()
					{
						var s = self.$state;
						if(!s)
						{
							return;
						}
						s.isLoading = false;
						for(var k in s)
						{
							if(Object.prototype.hasOwnProperty.call(s, k))
							{
								(function(k, v)
								{
									// Automatically handle promises in first level of the state, and re-render upon completion
									if(typeof v === 'object' && v !== null)
									{
										if(v instanceof Promise)
										{
											s.isLoading = true;
											s[k] = {
												type: 'htmlPromiseHandler',
												promise: v
													.then(result => s[k] = result)
													.catch(error => s.error = error)
													.finally(self.render)
											};
										}
										else if(v.type === 'htmlPromiseHandler')
										{
											s.isLoading = true;
										}
									}
									else if(typeof v === 'function') // execute functions in state, and replace
									{
										s[k] = v.call(self, self);
									}
								})(k, s[k]);
							}
						}
					},
					// querySelector equivalent on element, but retrieve the respective renderer object instead
					// may also directly pass a html node or element to find the respective renderer object (only if element is child of the current object)
					querySelector: function(selector)
					{
						var elem;
						if(typeof selector === 'string')
						{
							elem = self.element.querySelector(selector);
							if(!elem) return null;
						}
						else if(typeof selector === 'object')
						{
							elem = selector;
						}
						else
						{
							return null;
						}
						
						var prev_e = elem;
						var e = elem;
						while(e !== self.element)
						{
							prev_e = e;
							e = e.parentNode;
							if(!e) return null;
						}
						
						if(prev_e === e)
						{
							return self;
						}
						
						var children = self.children.slice();
						for(var i=0;i<children.length;++i)
						{
							var child = children[i];
							if(child.type === 'htmlElementComponent')
							{
								if(child.element === prev_e)
								{
									return child.querySelector(elem);
								}
							}
							else if(child.type === 'htmlRendererComponent')
							{
								// expand dynamic children from renderer
								children.splice.apply(children, [i+1, 0].concat(child.children));
							}
						}
						return null;
					},
					querySelectorAll: function(selector)
					{
						var result = [];
						var elems = [];
						if(typeof selector === 'string')
						{
							elems = self.element.querySelectorAll(selector);
							if(elems.length === 0) return result;
						}
						else if(typeof selector === 'object')
						{
							elems = [selector];
						}
						else
						{
							return result;
						}
						
						for(var i=0;i<elems.length;++i)
						{
							var elem = elems[i];
							var prev_e = elem;
							var e = elem;
							while(e !== self.element)
							{
								prev_e = e;
								e = e.parentNode;
								if(!e) break;
							}
							if(e)
							{
								if(prev_e === e)
								{
									result.push(self);
								}
								else
								{
									var children = self.children.slice();
									for(var j=0;j<children.length;++j)
									{
										var child = children[j];
										if(child.type === 'htmlElementComponent')
										{
											if(child.element === prev_e)
											{
												result.push(child.querySelectorAll(elem));
											}
										}
										else if(child.type === 'htmlRendererComponent')
										{
											// expand dynamic children from renderer
											children.splice.apply(children, [j+1, 0].concat(child.children));
										}
									}
								}
							}
						}
						
						return flatten(result);
					},
					// find based on characteristic, like $state structure, or $id value
					find: function(query, matchSelf)
					{
						// usage: container.find({$state: {images: []}}), container.find({$id: 'SomeIdentifier'}), container.find({element: {id: 'SomeIdentifier'}})
						if(matchSelf && match_objects(self, query))
						{
							return self;
						}
						var children = self.children.slice();
						for(var i=0;i<children.length;++i)
						{
							var child = children[i];
							if(child.type === 'htmlElementComponent')
							{
								var result = false;
								if((result = child.find(query, true)) !== null)
								{
									return result;
								}
							}
							else if(child.type === 'htmlRendererComponent')
							{
								// expand dynamic children from renderer
								children.splice.apply(children, [i+1, 0].concat(child.children));
							}
						}
						return null;
					},
					// find all based on characteristic, like $state structure, or $id value
					findAll: function(query, matchSelf)
					{
						if(matchSelf && match_objects(self, query))
						{
							return [self];
						}
						var found = [];
						var children = self.children.slice();
						for(var i=0;i<children.length;++i)
						{
							var child = children[i];
							if(child.type === 'htmlElementComponent')
							{
								found.push(child.findAll(query, true));
							}
							else if(child.type === 'htmlRendererComponent')
							{
								// expand dynamic children from renderer
								children.splice.apply(children, [i+1, 0].concat(child.children));
							}
						}
						return flatten(found);
					},
					isLoading: () => !!self.$state.isLoading,
					hasError: () => !!self.$state.error,
					setState: function(newstate)
					{
						merge(self.$state, newstate);
						
						self.render();
					},
					updateListener: function(k, fnc)
					{
						if(typeof fnc !== 'function')
						{
							if(typeof self.listeners[k] === 'function')
							{
								element.removeEventListener(k.substring(2), self.listeners[k]);
								delete self.listeners[k];
							}
						}
						else if(self.listeners[k] !== fnc) // unless listener is already exactly equal
						{
							if(typeof self.listeners[k] === 'function')
							{
								element.removeEventListener(k.substring(2), self.listeners[k]);
							}
							element.addEventListener(k.substring(2), function(e){ e = e || window.event || {}; e.$self = self; e.$element = self.element; options[k].call(self, e); }, false);
							self.listeners[k] = fnc;
							
						}
					},
					destroy: function(childrenToo)
					{
						if(!self.element.parentNode)
						{
							// only return true if the element could still be destroyed (not destroyed already)
							return false;
						}
						
						// first destroy children
						if(childrenToo && self.children.length)
						{
							for(var i=0;i<self.children.length;++i)
							{
								var child = self.children[i];
								child.destroy.call(child, childrenToo);
							}
						}
						
						// also, execute all destroyCallbacks
						if(self.destroyCallbacks)
						{
							while(self.destroyCallbacks.length)
							{
								self.destroyCallbacks.shift().call(self, self);
							}
						}
						
						// then finally remove child
						self.element.parentNode.removeChild(self.element);
						
						return true;
					},
					exec: function(fn) // return a function, if you want something to be run when the component is destroyed
					{
						self.render(); // always render before exec
						
						var result = fn.call(self, self);
						if(typeof result === 'function')
						{
							self.destroyCallbacks = self.destroyCallbacks || [];
							self.destroyCallbacks.push(result);
						}
						return self;
					},
					appendTo: function(container)
					{
						return self.render(container, true); // alias for render with append=true
					},
					renderChildren: function()
					{
						if(self.children.length)
						{
							self.element.innerHTML = '';
							
							for(var i=0;i<self.children.length;++i)
							{
								var child = self.children[i];
								child.render.call(child, self, true);
							}
						}
					},
					render: function(container, append)
					{
						if(container && container.element)
						{
							self.parent = container;
							
							// Test if stateless, passthrough
							var s = self;
							while(!('$state' in s))
							{
								if(!s.parent)
								{
									break;
								}
								s = s.parent;
							}
							self.root = s; // set self-reference, in case of passthrough, this may not refer to itself
						}
						
						// Update properties
						self.updateProperties();
						
						// Update state
						self.updateState();
						
						// Run prerender
						if(typeof self.$prerender === 'function')
						{
							self.$prerender(container, append);
						}
						
						// Render children
						if(!self.$renderChildren || self.$renderChildren === 'before')
						{
							if(container || self.element.parentNode)
							{
								self.renderChildren();
							}
						}
						
						// Update content, but only if there's a parentNode (thus it is not destroyed)
						if(container)
						{
							// Update binding to parent
							var c = container.element || container;
							var ctag = (c.nodeName + '').toLowerCase();
							var isTextContentOnly = ctag === 'script' || ctag === 'style';
							if(append)
							{
								if(isTextContentOnly)
								{
									c.innerText += self.element.innerText;
								}
								else
								{
									c.appendChild(self.element);
								}
							}
							else
							{
								if(isTextContentOnly)
								{
									c.innerText = self.element.innerText;
								}
								else
								{
									c.innerHTML = '';
									c.appendChild(self.element);
								}
							}
							
							if(self.$renderChildren === 'after')
							{
								self.renderChildren();
							}
						}
						
						if(typeof self.$postrender === 'function')
						{
							self.$postrender(container, append);
						}
						
						return null; // explicitly return null for render function, as it should always be the last in chain, otherwise, when returning from Renderer it may result in rendering twice
					}
				});
			}
			// check if any child has a Promise (children has to be an array)
			var _handleChildren = function(children)
			{
				var self = this;
				var promises = [];
				for(var i=0;i<children.length;++i)
				{
					var child = children[i];
					if(typeof child === 'object' && child !== null && child instanceof Promise)
					{
						// set children result upon completion
						(function(child, i)
						{
							promises.push(new Promise(function(resolve, reject)
							{
								child.then(function(result)
								{
									var subPromises = _handleChildren.call(self, flatten([result]));
									
									if(subPromises.length > 0)
									{
										// wait until sub children have been resolved before resolving this child
										Promise.all(subPromises).then(resolve).catch(reject);
									}
									else
									{
										resolve();
									}
								
								}).catch(reject);
							}));
						})(child, i);
					}
					else if(typeof child === 'function')
					{
						// if a function is given, we intend to use it as an inline render-only object
						children[i] = html.createRenderer(child);
					}
					else if(typeof child !== 'object')
					{
						children[i] = html.createElement('span', {innerText: child});
					}
					else if(child === null)
					{
						children.splice(i--, 1);
					}
				}
				return promises;
			};
			
			// set property reference
			self.children = children = flatten(children);
			
			// handle children recursively async
			var promises = _handleChildren.call(self, children);
			
			if(promises.length > 0)
			{
				// return a new promise, that will return the object after children promises have been fulfilled
				return new Promise(function(resolve, reject)
				{
					Promise.all(promises).then(function()
					{
						resolve(_createElement());
					}).catch(reject);
				});
			}
			else
			{
				return _createElement();
			}
		}
	};
})(window);
