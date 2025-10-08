const chalk = require("chalk");
const { Log } = require("../models");

let ioInstance = null;
function attachIO(io){ ioInstance = io; }

async function logMessage(
  currentNum = null,
  total = null,
  message = "",
  messageType = "info",
  wallet = "GLOBAL"
){
  const now = new Date();
  const ts = now.toLocaleString("id-ID", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})
                 .replace(/\./g,":").replace(/, /g," ");
  const prefix = currentNum && total ? `[${currentNum}/${total}] ` : "";

  let colored;
  switch(messageType){
    case "success": colored = chalk.green(`[✓] ${message}`); break;
    case "error":   colored = chalk.red(`[-] ${message}`);   break;
    case "process": colored = chalk.yellow(`[!] ${message}`);break;
    case "debug":   colored = chalk.blue(`[~] ${message}`);  break;
    default:        colored = chalk.white(`[?] ${message}`);
  }
  console.log(`${chalk.white("[")}${chalk.dim(ts)}${chalk.white("]")} ${prefix}${colored}`);

  if(ioInstance){
    ioInstance.emit("log", { wallet, msg: message, type: messageType, time: ts });
  }
  try{ await Log.create({ wallet, message, level: messageType }); }catch(_){}
}

module.exports = { logMessage, attachIO };
