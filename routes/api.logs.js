const router = require("express").Router();
const { Log, Wallet, User } = require("../models");
const { Op } = require("sequelize");

// list logs (lazy pagination)
router.get("/", async (req,res)=>{
  const { cursor, limit = 30, wallet } = req.query;
  const where = {};
  if (wallet) where.wallet = wallet;

  const idFilter = cursor ? { id: { [Op.lt]: cursor } } : {};
  Object.assign(where, idFilter);

  const rows = await Log.findAll({
    where,
    order: [["id","DESC"]],
    limit: Math.min(parseInt(limit,10)||30, 100)
  });

  res.json({ ok:true, items: rows, nextCursor: rows.length ? rows[rows.length-1].id : null });
});

module.exports = router;
