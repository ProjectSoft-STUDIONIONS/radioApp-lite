(async function($){

	const renderWindows = {};
	const renderToTabId = {};
	var currentTab;

	function getCurrentTab() {
		return new Promise(function(resolve, reject){
			chrome.tabs.getCurrent((tab) => {
				resolve(tab);
			});
		});
	}
	

	function startRenderInterval(renderTab) {
		let lastTime = +Date.now();
		const tabId = renderToTabId[renderTab.id];
		const renderWindow = renderWindows[tabId];
		const analyser = renderWindow.analyser;
		const analyserL = renderWindow.analyserL;
		const analyserR = renderWindow.analyserR;
		const renderIntervalId = setInterval(() => {
			const timeByteArray = new Uint8Array(1024);
			const timeByteArrayL = new Uint8Array(1024);
			const timeByteArrayR = new Uint8Array(1024);
			analyser.getByteTimeDomainData(timeByteArray);
			analyserL.getByteTimeDomainData(timeByteArrayL);
			analyserR.getByteTimeDomainData(timeByteArrayR);
			const currentTime = +Date.now();
			const elapsedTime = (currentTime - lastTime) / 1000;
			lastTime = currentTime;
			const renderOpts = {
				elapsedTime: elapsedTime,
				audioLevels: {
					timeByteArray: Array.from(timeByteArray),
					timeByteArrayL: Array.from(timeByteArrayL),
					timeByteArrayR: Array.from(timeByteArrayR)
				}
			};
			chrome.tabs.sendMessage(renderTab.id, {
				type: 'audioData',
				data: renderOpts
			});
		}, (1000 / 60));
		return renderIntervalId;
	}

	function startAudioCheckInterval(renderTab) {
		const tabId = renderToTabId[renderTab.id];
		const renderWindow = renderWindows[tabId];
		const audioCheckIntervalId = setInterval(() => {
			chrome.tabs.get(tabId, (tab) => {
				const wasAudible = renderWindow.audible;
				if (tab.audible !== wasAudible) {
					renderWindow.audible = tab.audible;
					if (tab.audible) {
						chrome.tabs.sendMessage(renderTab.id, {
							type: 'startRendering'
						});
						renderWindow.renderIntervalId = startRenderInterval(renderTab);
					} else {
						clearInterval(renderWindow.renderIntervalId);
						chrome.tabs.sendMessage(renderTab.id, {
							type: 'stopRendering'
						});
					}
				}
			});
		}, 1000);
		return audioCheckIntervalId;
	}

	$("#testBtn").on('click', async function(e){
		e.preventDefault();
		/*if(!renderTab){
			chrome.tabs.create({
				url: location.origin + "/visualizer.html",
				openerTabId: currentTab.id,
			}, (tab) => {
				renderTab = tab;
				startRenderInterval(renderTab);
			});
		}*/
		currentTab = await getCurrentTab();
		if(currentTab){
			if (renderWindows[currentTab.id]) {
				chrome.windows.update(renderWindows[currentTab.id].windowId, {
					focused: true
				});
			} else {
				chrome.tabCapture.capture({
					audio: true
				}, (stream) => {
					const audioContext = new AudioContext();
					const source = audioContext.createMediaStreamSource(stream);
					source.connect(audioContext.destination);
					renderWindows[currentTab.id] = true; // so we dont create twice while making tab
					chrome.tabs.create({
						url: chrome.extension.getURL('visualizer.html'),
						active: false
					}, (renderTab) => {
						chrome.windows.create({
							tabId: renderTab.id,
							type: 'popup',
							focused: true,
							width: 800,
							height: 600
						}, (window) => {
							const analyser = audioContext.createAnalyser();
							analyser.smoothingTimeConstant = 0.0;
							analyser.fftSize = 1024;
							const analyserL = audioContext.createAnalyser();
							analyserL.smoothingTimeConstant = 0.0;
							analyserL.fftSize = 1024;
							const analyserR = audioContext.createAnalyser();
							analyserR.smoothingTimeConstant = 0.0;
							analyserR.fftSize = 1024;
							const splitter = audioContext.createChannelSplitter(2);
							source.connect(analyser);
							source.connect(splitter);
							splitter.connect(analyserL, 0);
							splitter.connect(analyserR, 1);
							renderWindows[currentTab.id] = {
								id: renderTab.id,
								windowId: window.id,
								audible: currentTab.audible,
								stream: stream,
								audioContext: audioContext,
								audioSource: source,
								analyser: analyser,
								analyserL: analyserL,
								analyserR: analyserR
							};
							renderToTabId[renderTab.id] = currentTab.id;
							renderWindows[currentTab.id].audioCheckIntervalId = startAudioCheckInterval(renderTab);
							if (currentTab.audible) {
								renderWindows[currentTab.id].renderIntervalId = startRenderInterval(renderTab);
							} else {
								setTimeout(() => chrome.tabs.sendMessage(renderTab.id, {
									type: 'stopRendering'
								}), 1000);
							}
						});
					});
				});
			}
		}
		return !1;
	});

	//chrome.browserAction.onClicked.addListener((tab) => {
		
	//});

	function cleanupRenderWindow(renderWindow) {
		clearInterval(renderWindow.renderIntervalId);
		clearInterval(renderWindow.audioCheckIntervalId);
		renderWindow.stream.getTracks()
			.forEach((track) => {
				track.stop();
			});
		renderWindow.audioContext.close()
	}

	chrome.tabs.onRemoved.addListener((tabId) => {
		if (renderWindows[tabId]) {
			const renderWindow = renderWindows[tabId];
			cleanupRenderWindow(renderWindow);
			chrome.tabs.remove(renderWindow.id);
			renderWindows[tabId] = null;
			renderToTabId[renderWindow.id] = null;
		} else if (renderToTabId[tabId]) {
			const audioTabId = renderToTabId[tabId];
			const renderWindow = renderWindows[audioTabId];
			cleanupRenderWindow(renderWindow);
			renderWindows[audioTabId] = null;
			renderToTabId[tabId] = null;
		}
	});

}(jQuery));