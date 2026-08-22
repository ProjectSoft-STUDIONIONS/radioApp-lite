// Компонент станции
class StationComponent {
	constructor(station, document, localhost) {
		this.station = station;
		this.li = document.createElement('li');
		this.li.className = 'radio-item';
		this.li.dataset.id = station.id; // обязательно для Sortable
		this.li.dataset.name = station.name;
		this.li.dataset.genre = station.genre.join(",");
		this.li.dataset.stream = station.stream;
		this.li.dataset.title = station.name;

		// Разметка станции
		this.li.innerHTML = `<div class="radio-item-box">` +
								`<div class="radio-item-icon">` +
									`<span class="icons"></span>` +
									`<span class="favicon"><img src="${localhost}/${station.id}.png?hash=${new Date().getTime()}" alt="${station.name}"></span>` +
								`</div>` +
								`<div class="radio-item-wrap">` +
									`<span class="station-name">${station.name}</span>` +
								`</div>` +
								`<div class="radio-item-handler">` +
									`<span class="icon-handler">` +
										`<span class="top">▲</span>` +
										`<span class="center">●</span>` +
										`<span class="bottom">▼</span>` +
									`</span>` +
								`</div>` +
							`</div>`;
		// Добавить классы genre в транслите
		const { tagTranslit } = require('./translit.js');
		var key;
		for(key in station.genre) {
			const genre = tagTranslit(String(station.genre[key]).trim());
			if(genre !== "") {
				this.li.classList.add(genre);
			}
		}
		// Вся логика станции — тут
		this.bindEvents();
	}

	bindEvents() {
		//
		const btn = this.li.querySelector('.radio-item-icon');
		btn.addEventListener('click', (e) => {
			if(this.li.classList.contains('play')) {
				this.li.classList.remove('play');
				this.li.classList.remove('preload');
				this.li.classList.add('stop');
			} else if(this.li.classList.contains('stop')) {
				this.li.classList.add('play');
				this.li.classList.add('preload');
				this.li.classList.remove('stop');
			}
			this.li.dispatchEvent(new CustomEvent("radio:click", {
				bubbles: true,
				cancelable: false,
				target: this.li
			}));
		});
	}
}

module.exports = StationComponent
