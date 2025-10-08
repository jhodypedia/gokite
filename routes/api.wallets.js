const router = require("express").Router();
const { Wallet } = require("../models");

router.get("/", async (req,res)=>{
  const wallets = await Wallet.findAll({ where:{ user_id: req.session.user.id }, order:[["id","DESC"]] });
  res.json({ ok:true, wallets });
});
router.post("/", async (req,res)=>{
  try{
    const { address } = req.body;
    if(!address) return res.json({ ok:false, error:"Address required" });
    const w = await Wallet.create({ user_id:req.session.user.id, address, active:true });
    res.json({ ok:true, wallet:w });
  }catch(e){ res.json({ ok:false, error:e.message }); }
});
router.patch("/:id/toggle", async (req,res)=>{
  try{
    const w = await Wallet.findOne({ where:{ id:req.params.id, user_id:req.session.user.id } });
    if(!w) return res.json({ ok:false, error:"Not found" });
    w.active = !w.active; await w.save();
    res.json({ ok:true, active:w.active });
  }catch(e){ res.json({ ok:false, error:e.message }); }
});

module.exports = router;
