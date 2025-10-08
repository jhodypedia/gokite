const router = require("express").Router();
const { Interaction, Wallet } = require("../models");
const { Op } = require("sequelize");

router.get("/", async (req,res)=>{
  const { walletId, limit = 20, cursor } = req.query;
  const myWallet = await Wallet.findOne({ where:{ id: walletId, user_id: req.session.user.id } });
  if(!myWallet) return res.json({ ok:false, error:"Not found" });

  const where = { wallet_id: myWallet.id };
  if (cursor) where.id = { [Op.lt]: cursor };

  const items = await Interaction.findAll({
    where,
    order:[["id","DESC"]],
    limit: Math.min(parseInt(limit,10)||20, 100)
  });

  res.json({ ok:true, items, nextCursor: items.length ? items[items.length-1].id : null });
});

module.exports = router;
