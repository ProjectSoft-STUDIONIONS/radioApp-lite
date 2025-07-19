'use strict';
class LocaleApp {
	get appName() {
		return chrome.i18n.getMessage('appName');
	}
	get appError() {
		return chrome.i18n.getMessage('appError');
	}
	get appRepeat() {
		return chrome.i18n.getMessage('appRepeat');
	}
	get notStations() {
		return chrome.i18n.getMessage('notStations');
	}
	get close() {
		return chrome.i18n.getMessage('close');
	}
	get minimize() {
		return chrome.i18n.getMessage('minimize');
	}
	get restore() {
		return chrome.i18n.getMessage('restore');
	}
	get default() {
		return chrome.i18n.getMessage('default');
	}
	get goToDev() {
		return chrome.i18n.getMessage('goToDev');
	}
	get notToDev() {
		return chrome.i18n.getMessage('notToDev');
	}
	get editTitle() {
		return chrome.i18n.getMessage('editTitle');
	}
	get copyTitle() {
		return chrome.i18n.getMessage('copyTitle');
	}
	get copyOk() {
		return chrome.i18n.getMessage('copyOk');
	}
	get insertTitle() {
		return chrome.i18n.getMessage('insertTitle');
	}
	get deleteTitle() {
		return chrome.i18n.getMessage('deleteTitle');
	}
	get deleteStation() {
		return chrome.i18n.getMessage('deleteStation');
	}
	get exportTitle() {
		return chrome.i18n.getMessage('exportTitle');
	}
	get exportMessage() {
		return chrome.i18n.getMessage('exportMessage');
	}
	get importTitle() {
		return chrome.i18n.getMessage('importTitle');
	}
	get importMessage() {
		return chrome.i18n.getMessage('importMessage');
	}
	get insertName() {
		return chrome.i18n.getMessage('insertName');
	}
	get inserStream() {
		return chrome.i18n.getMessage('inserStream');
	}
	get insert() {
		return chrome.i18n.getMessage('insert');
	}
	get cancel() {
		return chrome.i18n.getMessage('cancel');
	}
	get ok() {
		return chrome.i18n.getMessage('ok');
	}
	get addIcon() {
		return chrome.i18n.getMessage('addIcon');
	}
	get settingsTitle() {
		return chrome.i18n.getMessage('settingsTitle');
	}
	get settingsEmpty() {
		return chrome.i18n.getMessage('settingsEmpty');
	}
	get settingsDefault() {
		return chrome.i18n.getMessage('settingsDefault');
	}
	get settingsNotify() {
		return chrome.i18n.getMessage('settingsNotify');
	}
	get appVizualuzer() {
		return chrome.i18n.getMessage('appVizualuzer');
	}
	get goToWebsite() {
		return chrome.i18n.getMessage('goToWebsite');
	}
}

var locale = new LocaleApp();

module.exports = locale;
