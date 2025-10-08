const router = require("express").Router();
const { User } = require("../models");
const bcrypt = require("bcryptjs");

router.post("/register", async (req,res)=>{
  try{
    const { username, password } = req.body;
    if(!username || !password) return res.json({ ok:false, error:"missing" });
    const exists = await User.findOne({ where: { username } });
    if(exists) return res.json({ ok:false, error:"Username taken" });
    const u = await User.create({ username, password_hash:"" });
    u.password_hash = await bcrypt.hash(password, 10);
    await u.save();
    res.json({ ok:true });
  }catch(e){ res.json({ ok:false, error:e.message }); }
});

router.post("/login", async (req,res)=>{
  try{
    const { username, password } = req.body;
    const u = await User.findOne({ where:{ username } });
    if(!u) return res.json({ ok:false, error:"Invalid" });
    const match = await bcrypt.compare(password, u.password_hash);
    if(!match) return res.json({ ok:false, error:"Invalid" });
    req.session.user = { id:u.id, username:u.username, role:u.role };
    res.json({ ok:true, user:req.session.user });
  }catch(e){ res.json({ ok:false, error:e.message }); }
});

router.post("/logout", (req,res)=> req.session.destroy(()=>res.json({ ok:true })));

module.exports = router;
