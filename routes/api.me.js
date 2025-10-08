const router = require("express").Router();
const { Wallet } = require("../models");

router.get("/profile", (req,res)=> res.json({ ok:true, user:req.session.user }));
router.get("/summary", async (req,res)=>{
  const wallets = await Wallet.findAll({ where:{ user_id: req.session.user.id } });
  const active = wallets.filter(w=>w.active).length;
  res.json({
    ok:true,
    totalWallets: wallets.length,
    activeWallets: active
  });
});

module.exports = router;
