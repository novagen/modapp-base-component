/**
 * Element node object
 * @typedef {Object} Elem~element
 * @property {string} tagName Element tag name
 * @property {string} [className] Element class name
 * @property {object} [events] Element events as a key/value object
 * @property {object} [attributes] Element attributes as a key/value object
 * @property {string} [id] Node id used to access the node.
 * @property {Array.<Elem~node>} [children] Array of child nodes
 */

/**
 * Component node object
 * @typedef {Object} Elem~component
 * @property {App~component} component Component
 * @property {string} [id] Node id used to access the node.
 */

/**
 * Text node object
 * @typedef {Object} Elem~text
 * @property {string} text Text to be put in the node
 * @property {string} [id] Node id used to access the node.
 */


/**
 * Node object
 * @typedef {(Elem~element|Elem~text|Elem~component)} Elem~node
 */

/**
 * Node builder
 */
let n = {

	/**
	 * Renders an element node
	 * @param {string} [id] Id of node
	 * @param {string} tagName Tag name. Eg. 'div'.
	 * @param {object} [opt] Optional parameters
	 * @param {string} [opt.className] Class name
	 * @param {object} [opt.attributes] Key/value object with attributes.
	 * @param {object} [opt.events] Key/value object with events, where the key is the event name, and the value is the callback function.
	 * @param {Array.<Elem~node>} [children] Array of child nodes
	 */
	elem: function(id, tagName, opt, children) {
		if (typeof tagName === 'object') {
			children = opt;
			opt = tagName;
			tagName = id;
			id = null;
		}

		if (Array.isArray(opt)) {
			children = opt;
			opt = null;
		}

		let node = {tagName};
		if (id) {
			node.id = id;
		}

		if (opt) {
			if (opt.className) {
				node.className = opt.className;
			}
			if (opt.attributes) {
				node.attributes = opt.attributes;
			}
			if (opt.events) {
				node.events = opt.events;
			}
		}

		if (children) {
			node.children = children;
		}

		return node;
	},
	text: function(id, text) {
		return typeof text === 'undefined'
			? {text: id}
			: {id, text};
	},
	component: function(id, component, opt) {
		if (typeof id !== 'string') {
			opt = component;
			component = id;
			id = null;
		}

		return id
			? {id, component}
			: {component};
	}
};

/**
 * An element node
 */
class Elem {

	/**
	 * Creates a new Elem instance
	 * @param {Elem~node} node Root node
	 */
	constructor(node) {
		if (typeof node === 'function') {
			node = node(n);
		} else {
			node = this._cloneNode(node);
		}

		this.node = node;
		this.idNode = {};

		this.element = null;

		this._getNodeIds(node);
	}

	render(div) {
		if (this.element) {
			throw "Already rendered";
		}

		return this.element = this._renderNode(div, this.node);
	}

	unrender() {
		if (!this.element) {
			return;
		}

		// Remove any event listeners
		if (this.eventListeners) {
			for (let evl of this.eventListeners) {
				evl[0].removeEventListener(evl[1], evl[2]);
			}
			this.eventListeners = null;
		}

		this._unrenderNode(this.node);

		if (this._getType(this.node) !== 'component') {
			this.element.parentNode.removeChild(this.element);
		}
		this.element = null;
	}

	/**
	 * Gets the root node element
	 * @returns {?App~component|Node} Component or null if there is no component for the given id.
	 */
	getElement() {
		return this.element;
	}

	/**
	 * Gets a node by its id
	 * @param {string} componentId Id of the component
	 * @returns {App~component|?Node} Component or rendered node (null if not rendered)..
	 */
	getNode(id) {
		let node = this.idNode[id];
		if (typeof node === 'undefined') {
			throw "Unknown node id";
		}
		return node.el;
	}

	/**
	 * Set className on the root node
	 * @param {?string} className Class name
	 * @returns {this}
	 */
	setClassName(className) {
		return this._setClassName(this.node, className);
	}

	/**
	 * Set className on a identifiable node
	 * @param {string} id Node id
	 * @param {?string} className Class name
	 * @returns {this}
	 */
	setNodeClassName(id, className) {
		return this._setClassName(this.getNode(id), className);
	}

	_setClassName(node, className) {
		this._validateIsTag(node);

		className = className || null;
		if (node.className !== className) {
			node.className = className;
			if (node.el) {
				if (className) {
					node.el.className = className;
				} else {
					node.el.removeAttribute('class');
				}
			}
		}

		return this;
	}

	setAttribute(name, value) {
		return this._setAttribute(this.node, name, value);
	}

	setNodeAttribute(id, name, value) {
		return this._setAttribute(this.getNode(id), name, value);
	}

	_setAttribute(node, name, value) {
		this._validateIsTag(node);

		let attr = node.attributes;
		if (attr) {
			if (attr[name] === value) {
				return this;
			}
		} else {
			attr = {};
			node.attributes = attr;
		}

		attr[name] = value;

		if (node.el) {
			node.el.addAttribute(name, value);
		}

		return this;
	}

	removeAttribute(name) {
		return this._removeAttribute(this.node, name);
	}

	removeNodeAttribute(id, name) {
		return this._removeAttribute(this.getNode(id), name);
	}

	_removeAttribute(node, name) {
		this._validateIsTag(node);
		let attr = node.attributes;
		if (attr  && attr.hasOwnProperty(name)) {
			delete attr[name];

			if (node.el) {
				node.el.removeAttribute(name);
			}
		}

		return this;
	}

	setDisabled(isDisabled) {
		return this._setDisabled(this.node, isDisabled);
	}

	setNodeDisabled(id, isDisabled) {
		return this._setDisabled(this.getNode(id), isDisabled);
	}

	_setDisabled(node, isDisabled) {
		if (isDisabled) {
			this._setAttribute(node, 'disabled', 'disabled');
		} else {
			this._removeAttribute(node, 'disabled');
		}
		return this;
	}

	_validateIsTag(node) {
		if (this._getType(node) !== 'tag') {
			throw "Node must be of type element";
		}
	}

	_getNodeIds(node) {
		if (!node || typeof node !== 'object') {
			throw "Invalid Elem node";
		}

		let id = node.id;

		if (id) {
			if (typeof id !== 'string') {
				throw "Node id must be a string";
			}

			if (this.idNode.hasOwnProperty(id)) {
				throw "Node id " + id + " used multiple times";
			}

			// Set node to null (not rendered) as default
			this.idNode[id] = node;
		}

		node.el = null;

		switch (this._getType(node)) {
		case 'tag':
			if (!node.children) {
				break;
			}

			// Iterate over the children
			for (var i = 0; i < node.children.length; i++) {
				this._getNodeIds(node.children[i]);
			}

			break;

		case 'component':
			node.el = node.component;
			break;
		}

	}

	_getType(node) {
		if (node.hasOwnProperty('tagName')) {
			return 'tag';
		}

		if (node.hasOwnProperty('text')) {
			return 'text';
		}

		if (node.hasOwnProperty('component')) {
			return 'component';
		}

		throw "Unknown node type";
	}

	_renderNode(div, node) {
		switch (this._getType(node)) {
		case 'tag':
			let el = document.createElement(node.tagName);

			if (node.attributes) {
				for (let key in node.attributes) {
					if (node.attributes.hasOwnProperty(key)) {
						el.setAttribute(key, node.attributes[key]);
					}
				}
			}

			if (node.events) {
				this.eventListeners = this.eventListeners || [];
				for (let key in node.events) {
					if (node.events.hasOwnProperty(key)) {
						let cb = node.events[key];
						el.addEventListener(key, cb);
						this.eventListeners.push([el, key, cb]);
					}
				}
			}

			if (node.className) {
				el.className = Array.isArray(node.className)
					? node.className.join(' ')
					: node.className;
			}

			node.el = el;

			if (div) {
				div.appendChild(el);
			}

			if (node.children) {
				// Render the children
				for (var i = 0; i < node.children.length; i++) {
					this._renderNode(el, node.children[i]);
				}
			}

			return el;

		case 'text':
			var txtNode = document.createTextNode(node.text);

			node.el = txtNode;

			if (div) {
				div.appendChild(txtNode);
			}

			return txtNode;

		case 'component':
			return node.component
				? node.component.render(div)
				: null;
		}
	}

	_unrenderNode(node) {
		switch (this._getType(node)) {
		case 'tag':
			node.el = null;

			if (node.children) {
				// Unrender the children
				for (var i = 0; i < node.children.length; i++) {
					this._unrenderNode(node.children[i]);
				}
			}
			break;

		case 'text':
			node.el = null;
			break;

		case 'component':
			if (node.component) {
				node.component.unrender();
			}
			break;
		}
	}

	_cloneNode(node) {
		if (!node) {
			return node;
		}

		let c = Object.assign({}, node);
		if (c.children) {
			let l = c.children.length;
			let chs = new Array(l);
			for (let i = 0; i < l; i++) {
				chs[i] = this._cloneNode(c.children[i]);
			}

			c.children = chs;
		}
	}
}

export default Elem;