class TagsEditor extends HTMLElement {

	static observedAttributes = ['list', 'genre'];

	constructor() {
		super();
		let shadow = this.attachShadow({
			mode: "open"
		});
		let css = `*,::after,::before{box-sizing:border-box}.tags{display:-ms-flexbox;display:flex;-ms-flex-direction:column;flex-direction:column;gap:var(--tags-editor-gap,.3em);width:100%;max-width:100%;min-width:100%}.tags-list{display:-ms-flexbox;display:flex;-ms-flex-direction:row;flex-direction:row;gap:var(--tags-editor-gap,.3em);-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex-pack:justify;justify-content:space-between;width:100%;max-width:100%;min-width:100%;min-height:1.43em;font-size:1em}.tags-list>span{display:-ms-flexbox;display:flex;padding:.2em .3em;background-color:var(--tags-editor-bgcolor,red);color:var(--tags-editor-tag-color,#fff);line-height:1;white-space:nowrap;position:relative;-ms-flex-positive:1;flex-grow:1;-ms-flex-pack:justify;justify-content:space-between}.tags-list>span,.tags-list>span *{-webkit-user-select:none;-ms-user-select:none;user-select:none}.tags-list>span .icon-close{cursor:pointer;margin-left:.5em;font-style:normal;border-radius:50%;background-color:var(--tags-editor-btn-bgcolor,#e61919);font-size:.55em;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex-pack:center;justify-content:center;justify-items:center;-ms-flex-line-pack:center;align-content:center;width:1.8185em;height:1.8185em;transition:background-color .3s ease;overflow:hidden}.tags-list>span .icon-close::before{content:"✕";display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex:1 0 auto;flex:1 0 auto;width:100%;height:100%;min-height:100%;text-align:center;-ms-flex-pack:center;justify-content:center;justify-items:center;-ms-flex-line-pack:center;align-content:center}.tags-list>span .icon-close:hover{background-color:var(--tags-editor-btn-hover-bgcolor,#bf4040)}.tags-input{position:relative;display:-ms-flexbox;display:flex;-ms-flex-direction:column;flex-direction:column;gap:var(--tags-editor-gap,.3em);width:100%;max-width:100%;min-width:100%}.tags-input select{max-width:1.1em;min-width:1.1em;position:absolute;top:0;right:0;bottom:0;height:100%;min-height:100%}.tags-input input{width:calc(100% - 1.4em);max-width:calc(100% - 1em);min-width:calc(100% - 1em);position:relative}.tags-input input,.tags-input select{font-size:1em;-webkit-user-select:auto;-ms-user-select:auto;user-select:auto;display:block;width:100%;font-family:Bender,sans-serif;outline:0!important}`;
		let style = document.createElement('style');
		let tags = document.createElement('div');
		let tagsList = document.createElement('div');
		let tagsInput = document.createElement('div');
		let elInput = document.createElement('input');
		let elSelect = document.createElement('select');
		tags.classList.add('tags');
		tagsList.classList.add('tags-list');
		tagsInput.classList.add('tags-input');
		elSelect.classList.add('tags-input-select');
		elInput.classList.add('tags-input-input');
		elInput.placeholder = "Enter tag..."
		elSelect.placeholder = "Select tag..."
		elInput.type = "text";
		style.type = 'text/css';
		style.appendChild(document.createTextNode(css));
		shadow.appendChild(style);
		shadow.appendChild(tags);
		tags.appendChild(tagsList);
		tags.appendChild(tagsInput);
		tagsInput.appendChild(elInput);
		tagsInput.appendChild(elSelect);
	}

	writeTagsList() {
		let value = this.value;
		let tagList = this.shadowRoot.querySelector('.tags-list');
		tagList.innerHTML = "";
		for(let index in value){
			let tag = value[index];
			let tagEl = document.createElement('span');
			let closeEl = document.createElement('i');
			closeEl.classList.add('icon-close');
			tagEl.appendChild(document.createTextNode(tag));
			tagEl.appendChild(closeEl);
			tagList.appendChild(tagEl);
		}
	}

	handlerClick(e) {
		e.preventDefault();
		let vals = this.value || [];
		let target = e.target;
		//console.log('handler', e.target.className);
		switch(e.target.className) {
			case 'icon-close':
				let tag = e.target.parentNode;
				let text = tag.textContent.trim();
				let index = vals.indexOf(text);
				index > -1 ? (
					vals.splice(index, 1),
					tag.parentNode.removeChild(tag)
				) : false;
				this.setAttribute('list', [...new Set(vals)].sort());
				break;
		}
		return !1;
	}

	handlerInput(e) {
		let vals = this.value || [];
		let target = e.target;
		let value;
		switch(e.target.className) {
			case 'tags-input-select':
				e.preventDefault();
				value = target.value;
				if(value){
					vals.push(value);
					this.setAttribute('list', [...new Set(vals)].sort());
				}
				target.value = "";
				return !1;
				break;
			case 'tags-input-input':
				if(e.type == "keydown") {
					switch(e.key) {
						case ",":
						case ".":
						case "?":
						case "<":
						case ">":
						case "+":
						case "=":
						case ")":
						case "(":
						case "*":
						case "&":
						case "%":
						case "$":
						case "#":
						case "№":
						case "@":
						case "!":
						case "\"":
						case "'":
						case "\\":
						case "}":
						case "{":
						case "[":
						case "]":
						case "|":
						case "`":
						case "~":
						case "Enter":
							e.preventDefault();
							value = target.value;
							value = value.replace(/[^а-яА-Яa-zA-Z0-9\s_/-]+/g, "")
										.replace(/^[\s_-]+/g, "")
										.replace(/\s+/g, " ")
										.replace(/_+/g, "_")
										.replace(/-+/g, "-")
										.replace(/[\s_-]+$/g, "")
										.trim();
							value = value.charAt(0).toUpperCase() + value.slice(1);
							if(value){
								let setters = new Set(this.value);
								setters.add(value.trim());
								this.setAttribute('list', [...setters].sort());
							}
							target.value = "";
							return !1;
							break;
					}
				}
				if(e.type == "keyup"){
					switch(e.key) {
						case " ":
						case "/":
						case "-":
						case "_":
							e.preventDefault();
							value = target.value;
							value = value.replace(/[^а-яА-Яa-zA-Z0-9\s_/-]+/g, "")
										.replace(/^[\s_-]+/g, "")
										.replace(/\s+/g, " ")
										.replace(/_+/g, "_")
										.replace(/-+/g, "-")
										.replace(/_-|-_/g, "_");
							value = value.charAt(0).toUpperCase() + value.slice(1);
							target.value = value;
							return !1;
							break;
					}
				}
				if(e.type == "input") {
					e.preventDefault();
					value = target.value;
					value = value.replace(/[^а-яА-Яa-zA-Z0-9\s_/-]+/g, "")
								.replace(/^[\s_-]+/g, "")
								.replace(/\s+/g, " ")
								.replace(/_+/g, "_")
								.replace(/-+/g, "-");
					value = value.charAt(0).toUpperCase() + value.slice(1);
					target.value = value;
					return !1;
							break;
				}
				break;
		}
	}

	attributeChangedCallback (name, oldValue, newValue) {
		try {
			let old = [...new Set(oldValue.split(',').map((e) => e.trim()).sort())],
				value = [...new Set(newValue.split(',').map((e) => e.trim()).sort())];
			const compareArrays = (a, b) => {
				return JSON.stringify(a) === JSON.stringify(b);
			};
			if(!compareArrays(old, value)) {
				this.setAttribute(name, value);
				if(name == 'list') {
					this.value = value;
					this.dispatchEvent(new CustomEvent('change', {
						bubbles: true,
						composed: true
					}));
				}
			}
			if(name == 'list') {
				this.writeTagsList();
			}
		}catch(e) {}
	}

	get value() {
		try {
			let old = this.getAttribute('list');
			if(old){
				old = [...new Set(old.split(',').map((e) => e.trim()).sort())];
				return old;
			}else{
				return [];
			}
		}catch(e) {
			return [];
		}
	}

	set value(value) {
		if(typeof value == 'object') {
			let old = this.getAttribute('list'),
				setters;
			if(old){
				old = [...new Set(old.split(',').map((e) => e.trim()).sort())];
			}else{
				old = [];
			}
			setters = new Set(old);
			for(let val in value){
				setters.add(value[val]);
			}
			let arr = [...setters];
			this.setAttribute('list', arr);
		}
	}

	connectedCallback() {
		// List
		let list = this.getAttribute('list');
		if(!list) list = "";
		list = [...new Set(list.split(',').map((e) => e.trim()).sort())];
		this.setAttribute('list', list);
		// Genre
		let genre = this.getAttribute('genre');
		if(!genre) genre = "";
		genre = [...new Set(genre.split(',').map((e) => e.trim()).sort())];
		let tags = this.shadowRoot.querySelector('.tags');
		let select = this.shadowRoot.querySelector('select');
		let none = document.createElement('option');
		none.value="";
		none.textContent = "";
		select.value = "";
		select.innerHTML = "";
		select.appendChild(none);
		this.setAttribute('genre', genre);
		for(let sel in genre) {
			let selText = genre[sel];
			if(selText) {
				let option = document.createElement('option');
				option.value = selText;
				option.textContent = selText;
				select.appendChild(option);
			}
		}
		tags.addEventListener('click', this.handlerClick.bind(this));
		tags.addEventListener('keydown', this.handlerInput.bind(this));
		tags.addEventListener('keyup', this.handlerInput.bind(this));
		tags.addEventListener('input', this.handlerInput.bind(this));
	}

	disconnectedCallback() {
		console.log('Disconnect');
	}
}

customElements.define("tags-editor", TagsEditor);