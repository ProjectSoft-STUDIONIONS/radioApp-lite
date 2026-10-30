/**!
 * Module toast.js for "Your Radio"
 * 
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
const{execFile:execFile}=require("child_process"),path=require("path"),toastNotify=t=>{if(!t||!t.station&&!t.track)return void console.warn("Toast skipped: station and/or track is missing");const a=path.join(path.dirname(process.execPath),"toast.exe"),s=[];var e=[a];t.station&&(s.push("-t",t.station),e.push(`-t "${t.station}"`)),t.track&&(s.push("-d",t.track),e.push(`-d "${t.track}"`)),t.iconPath&&(s.push("-i",t.iconPath),e.push(`-i "${t.iconPath}"`)),t.imagePath&&(s.push("-p",t.imagePath),e.push(`-p "${t.imagePath}"`)),t.appName&&(s.push("-a",t.appName),e.push(`-a "${t.appName}"`)),console.log(e.join(" ")),execFile(a,s,t=>{t&&console.warn("Toast notification failed:",t.message)})};module.exports={toastNotify:toastNotify};
