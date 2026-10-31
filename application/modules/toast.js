/**!
 * Module toast.js for "Your Radio"
 *
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
const{execFile:execFile}=require("child_process"),path=require("path"),toastNotify=t=>{if(!t||!t.station&&!t.track)return void console.warn("Toast skipped: station and/or track is missing");const e=path.join(path.dirname(process.execPath),"toast.exe"),a=[];t.station&&a.push("-t",t.station),t.track&&a.push("-d",t.track),t.iconPath&&a.push("-i",t.iconPath),t.imagePath&&a.push("-p",t.imagePath),t.appName&&a.push("-a",t.appName),execFile(e,a,(t,e,a)=>{t?console.warn("Toast notification failed:",err.message):(console.log(`stdout: ${e}`),a&&console.error(`stderr: ${a}`))})};module.exports={toastNotify:toastNotify};
