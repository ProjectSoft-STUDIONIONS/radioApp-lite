/**!
 * Module eventdispatcher.js for "Your Radio"
 * 
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
var EventDispatcher=function(){};Object.assign(EventDispatcher.prototype,{addEventListener:function(i,e){void 0===this._listeners&&(this._listeners={});var t=this._listeners;void 0===t[i]&&(t[i]=[]),-1===t[i].indexOf(e)&&t[i].push(e)},hasEventListener:function(i,e){if(void 0===this._listeners)return!1;var t=this._listeners;return void 0!==t[i]&&-1!==t[i].indexOf(e)},removeEventListener:function(i,e){if(void 0!==this._listeners){var t=this._listeners[i];if(void 0!==t){var s=t.indexOf(e);-1!==s&&t.splice(s,1)}}},dispatchEvent:function(i){if(void 0!==this._listeners){var e=this._listeners[i.type];if(void 0!==e){i.target=this;var t=[],s=0,n=e.length;for(s=0;s<n;s++)t[s]=e[s];for(s=0;s<n;s++)t[s].call(this,i)}}}}),module.exports=EventDispatcher;
