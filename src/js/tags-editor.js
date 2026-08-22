class TagsEditor extends HTMLElement {

	static observedAttributes = ['list', 'genre'];

	constructor() {
		super();
		const shadow = this.attachShadow({
			mode: "open"
		});
		const css = `*,::after,::before{box-sizing:border-box}.tags{display:-ms-flexbox;display:flex;-ms-flex-direction:column;flex-direction:column;gap:var(--tags-editor-gap,.3em);width:100%;max-width:100%;min-width:100%}.tags-list{display:-ms-flexbox;display:flex;-ms-flex-direction:row;flex-direction:row;gap:var(--tags-editor-gap,.3em);-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex-pack:justify;justify-content:space-between;width:100%;max-width:100%;min-width:100%;min-height:1.43em;font-size:1em}.tags-list>span{display:-ms-flexbox;display:flex;padding:.2em .3em;background-color:var(--tags-editor-bgcolor,red);color:var(--tags-editor-tag-color,#fff);line-height:1;white-space:nowrap;position:relative;-ms-flex-positive:1;flex-grow:1;-ms-flex-pack:justify;justify-content:space-between}.tags-list>span,.tags-list>span *{-webkit-user-select:none;-ms-user-select:none;user-select:none}.tags-list>span .icon-close{cursor:pointer;margin-left:.5em;font-style:normal;border-radius:50%;background-color:var(--tags-editor-btn-bgcolor,#e61919);font-size:.55em;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex-pack:center;justify-content:center;justify-items:center;-ms-flex-line-pack:center;align-content:center;width:1.8185em;height:1.8185em;transition:background-color .3s ease;overflow:hidden}.tags-list>span .icon-close::before{content:"✕";display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex:1 0 auto;flex:1 0 auto;width:100%;height:100%;min-height:100%;text-align:center;-ms-flex-pack:center;justify-content:center;justify-items:center;-ms-flex-line-pack:center;align-content:center}.tags-list>span .icon-close:hover{background-color:var(--tags-editor-btn-hover-bgcolor,#bf4040)}.tags-input{position:relative;display:-ms-flexbox;display:flex;-ms-flex-direction:column;flex-direction:column;gap:var(--tags-editor-gap,.3em);width:100%;max-width:100%;min-width:100%}.tags-input select{max-width:1.1em;min-width:1.1em;position:absolute;top:0;right:0;bottom:0;height:100%;min-height:100%}.tags-input input{width:calc(100% - 1.4em);max-width:calc(100% - 1em);min-width:calc(100% - 1em);position:relative}.tags-input input,.tags-input select{font-size:1em;-webkit-user-select:auto;-ms-user-select:auto;user-select:auto;display:block;width:100%;font-family:Bender,sans-serif;outline:0!important}`;
		const style = document.createElement('style');
		const tags = document.createElement('div');
		const tagsList = document.createElement('div');
		const tagsInput = document.createElement('div');
		const elInput = document.createElement('input');
		const elSelect = document.createElement('select');
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
		const value = this.value;
		const tagList = this.shadowRoot.querySelector('.tags-list');
		tagList.innerHTML = "";
		for(const index in value){
			const tag = value[index];
			try {
				if(tag && tag.length){
					const tagEl = document.createElement('span');
					const closeEl = document.createElement('i');
					closeEl.classList.add('icon-close');
					tagEl.appendChild(document.createTextNode(tag));
					tagEl.appendChild(closeEl);
					tagList.appendChild(tagEl);
				}
			} catch(e) {}
		}
	}

	handlerClick(e) {
		e.preventDefault();
		const vals = this.value || [];
		const target = e.target;
		//console.log('handler', e.target.className);
		switch(e.target.className) {
			case 'icon-close':
				const tag = e.target.parentNode;
				const text = tag.textContent.trim();
				const index = vals.indexOf(text);
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
		const vals = this.value || [];
		const target = e.target;
		var value;
		switch(e.target.className) {
			case 'tags-input-select':
				e.preventDefault();
				value = target.value;
				if(value){
					vals.push(value);
					this.setAttribute('list', [...new Set(vals)].sort());
				}
				target.value = "";
				const arr1 = this.getAttribute('list').split(",");
				const arr2 = this.getAttribute('genre').split(",")
				const set1 = new Set(arr1);
				const set2 = new Set(arr2);
				const result = [
					...arr1.filter(x => !set2.has(x)),
					...arr2.filter(x => !set1.has(x))
				];
				this.setAttribute('genre', [...new Set(result)].sort().toString());
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
										.replace(/\/+/g, "/")
										.replace(/[\s_-]+$/g, "")
										.trim();
							value = value.charAt(0).toUpperCase() + value.slice(1);
							try {
								if(value && value.length){
									const setters = new Set(this.value);
									setters.add(value.trim());
									this.setAttribute('list', [...setters].sort());
								}
							} catch(e){}
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
										.replace(/_-|-_/g, "_")
										.replace(/_+/g, "_")
										.replace(/-+/g, "-")
										.replace(/\/+/g, "/");
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
			const old = [...new Set(oldValue.split(',').map((e) => e.trim()).sort())],
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
			if(name == 'genre') {
				
			}
		}catch(e) {}
	}

	get value() {
		try {
			var old = this.getAttribute('list');
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
			var old = this.getAttribute('list'),
				setters;
			if(old){
				old = [...new Set(old.split(',').map((e) => e.trim()).sort())];
			}else{
				old = [];
			}
			setters = new Set(old);
			for(const val in value){
				try{
					if(value[val] && value[val].length){
						setters.add(value[val]);
					}
				}catch(e){}
			}
			const arr = [...setters];
			this.setAttribute('list', arr);
		}
	}

	connectedCallback() {
		// List
		var list = this.getAttribute('list');
		if(!list) list = "";
		list = [...new Set(list.split(',').map((e) => e.trim()).sort())];
		this.setAttribute('list', list);
		// Genre
		var genre = this.getAttribute('genre');
		if(!genre) genre = "";
		genre = [...new Set(genre.split(',').map((e) => e.trim()).sort())];
		const tags = this.shadowRoot.querySelector('.tags');
		const select = this.shadowRoot.querySelector('select');
		const none = document.createElement('option');
		none.value="";
		none.textContent = "";
		select.value = "";
		select.innerHTML = "";
		select.appendChild(none);

		this.setAttribute('genre', genre);
		for(const sel in genre) {
			const selText = genre[sel];
			try {
				if(selText && selText.length) {
					const option = document.createElement('option');
					option.value = selText;
					option.textContent = selText;
					select.appendChild(option);
				}
			} catch(e) {}
		}
		tags.addEventListener('click', this.handlerClick.bind(this));
		tags.addEventListener('keydown', this.handlerInput.bind(this));
		tags.addEventListener('keyup', this.handlerInput.bind(this));
		tags.addEventListener('input', this.handlerInput.bind(this));
	}

	disconnectedCallback() {}
}

customElements.define("tags-editor", TagsEditor);
