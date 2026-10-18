/**!
 * Module locale.js for "Your Radio"
 * 
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
const isEmpty=r=>{if(null==r)return!0;if(!1===r)return!0;if(void 0===r)return!0;return""===String(r).trim()},isArray=r=>Array.isArray(r),locale={get:(r,e=[])=>{r=String(r).trim(),e=isArray(e)?Object.values(e).slice(0,8):[];const t=chrome.i18n.getMessage(r,e);return isEmpty(t)?r:t}};module.exports=locale;
