'use strict';
const sdk = (nw.process.versions["nw-flavor"] == "sdk"),
	log = function(){
		sdk && console.log.call(arguments);
	};

exports.log = log;