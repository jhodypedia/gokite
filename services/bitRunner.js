const { Wallet, Interaction } = require("../models");
const gokiteV2Bot = require("./gokiteV2Bot");
const { logMessage, attachIO } = require("../utils/logger");

function initBotRunner(io){
  attachIO(io);
  const interval = parseInt(process.env.RUN_INTERVAL_MS || "300000", 10);

  async function resetDaily(w){
    const now = new Date();
    if(!w.last_reset_at || (now - new Date(w.last_reset_at)) > 24*60*60*1000){
      w.daily_points = 0;
      w.last_reset_at = now;
      await w.save();
    }
  }

  async function tick(){
    try {
      const wallets = await Wallet.findAll({ where: { active:true } });
      const total = wallets.length || 1;
      let idx = 0;

      for(const w of wallets){
        idx++;
        await resetDaily(w);
        await logMessage(idx,total,"Starting wallet task...", "info", w.address);
        const bot = new gokiteV2Bot(w.address, null, idx, total);

        try{
          const { points, keepAlive } = await bot.processKeepAlive();
          await logMessage(idx,total,`Result keepAlive=${!!keepAlive} XP=${points}`, "success", w.address);

          await Interaction.create({
            wallet_id: w.id,
            question: "auto-session",
            response: JSON.stringify({ points, keepAlive })
          });

          // broadcast summary for dashboard badges
          io.emit("walletSummary", {
            walletId: w.id,
            address: w.address,
            points,
            lastRunAt: new Date().toISOString()
          });

        }catch(e){
          await logMessage(idx,total,`Wallet error: ${e.message}`, "error", w.address);
        }
      }
    } catch(e){
      await logMessage(0,0,`Runner error: ${e.message}`, "error", "GLOBAL");
    }
  }

  tick(); // run at start
  setInterval(tick, interval);
}

module.exports = { initBotRunner };
