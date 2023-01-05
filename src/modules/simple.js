const parser = require("./Parser.js");
const radioStation = new parser.Parser({
	autoUpdate: true,
	emptyInterval: 5,
	errorInterval: 5,
	keepListen: false,
	metadataInterval: 5,
	notifyOnChangeOnly: true,
	userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36',
	url: 'https://live.hunter.fm/80s_high'
});
radioStation.on('metadata', (metadata) => console.log(`${metadata.get('StreamTitle') || 'unknown'}`));
radioStation.on('error', (err)=> console.log(`${err}`));