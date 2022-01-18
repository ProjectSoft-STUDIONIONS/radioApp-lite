const parser = require("./Parser.js");
const radioStation = new parser.Parser({
	autoUpdate: true, // �������������� �������� == true
	emptyInterval: 5, // ���������� ���� ����� ������ ������ ���������� (sec)
	errorInterval: 5, // ���������� ���� ������ ���������� (sec)
	keepListen: false, // ���������� ������������� ������ == true
	metadataInterval: 5, // ������ ��������� ���������� (sec)
	notifyOnChangeOnly: true, // ���������� ������ ������������ ���������� == true
	userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36', //(sec)
	url: 'https://live.hunter.fm/80s_high' //������ ������
});
radioStation.on('metadata', (metadata) => console.log(`${metadata.get('StreamTitle') || 'unknown'}`));
radioStation.on('error', (err)=> console.log(`${err}`));