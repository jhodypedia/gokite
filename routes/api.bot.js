const router = require("express").Router();
const { Wallet } = require("../models");
const gokiteV2Bot = require("../services/gokiteV2Bot");
const { logMessage } = require("../utils/logger");

// manual start for one wallet
router.post("/start", async (req,res)=>{
  try{
    const { walletId } = req.body;
    const w = await Wallet.findOne({ where:{ id:walletId, user_id:req.session.user.id } });
    if(!w) return res.json({ ok:false, error:"Not found" });

    (async()=>{
      const bot = new gokiteV2Bot(w.address, null, 1, 1);
      await logMessage(1,1,"Manual start...", "process", w.address);
      try{
        const result = await bot.processKeepAlive();
        await logMessage(1,1,`Manual result: ${JSON.stringify(result)}`, "success", w.address);
      }catch(e){
        await logMessage(1,1,`Manual error: ${e.message}`, "error", w.address);
      }
    })();

    res.json({ ok:true, message:"started" });
  }catch(e){ res.json({ ok:false, error:e.message }); }
});

module.exports = router;
