/**!
 * Module translit.js for "Your Radio"
 * 
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
const{transliterate:transliterate}=require("transliteration"),tagTranslit=t=>{if(!t||"string"!=typeof t)return"";return transliterate(t.trim()).replace(/[^A-Za-z0-9]/g,"").toLowerCase()},translit=t=>t&&"string"==typeof t?transliterate(t.trim()):"";module.exports={translit:translit,tagTranslit:tagTranslit};
