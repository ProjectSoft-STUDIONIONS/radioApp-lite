'use strict';
class LocaleApp {
	get appName() {
		return chrome.i18n.getMessage('appName');
	}
	get appError() {
		return chrome.i18n.getMessage('appError');
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
	get editStation() {
		return chrome.i18n.getMessage('editStation');
	}
	get exportTitle() {
		return chrome.i18n.getMessage('exportTitle');
	}
	get importTitle() {
		return chrome.i18n.getMessage('importTitle');
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
	/*
	get () {
		return chrome.i18n.getMessage('');
	}
	get () {
		return chrome.i18n.getMessage('');
	}
	get () {
		return chrome.i18n.getMessage('');
	}
	get () {
		return chrome.i18n.getMessage('');
	}
	*/
}

var _l = new LocaleApp();
if(typeof exports == "undefined"){
	window.locale = _l;
}else{
	module.exports = _l;
}