const parser = require("./Parser.js");
const radioStation = new parser.Parser({
	autoUpdate: true, // Автообновление включено == true
	emptyInterval: 5, // Обновление если стрим вернул пустую метаданных (sec)
	errorInterval: 5, // Обновление если ошибка метаданных (sec)
	keepListen: false, // Постоянное прослушивание потока == true
	metadataInterval: 5, // Период получения метаданных (sec)
	notifyOnChangeOnly: true, // Возвращать только изменившийся метаданные == true
	userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36', //(sec)
	url: 'https://live.hunter.fm/80s_high' //ссылка потока
});
radioStation.on('metadata', (metadata) => console.log(`${metadata.get('StreamTitle') || 'unknown'}`));
radioStation.on('error', (err)=> console.log(`${err}`));