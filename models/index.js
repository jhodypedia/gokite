const { Sequelize } = require("sequelize");
const dbConf = require("../config/db");

const sequelize = new Sequelize(
  dbConf.database,
  dbConf.username,
  dbConf.password,
  {
    host: dbConf.host,
    dialect: dbConf.dialect,
    logging: dbConf.logging
  }
);

const User = require("./User")(sequelize);
const Wallet = require("./Wallet")(sequelize);
const Interaction = require("./Interaction")(sequelize);
const Log = require("./Log")(sequelize);

// Associations
User.hasMany(Wallet, { foreignKey: "user_id" });
Wallet.belongsTo(User, { foreignKey: "user_id" });

Wallet.hasMany(Interaction, { foreignKey: "wallet_id" });
Interaction.belongsTo(Wallet, { foreignKey: "wallet_id" });

module.exports = { sequelize, User, Wallet, Interaction, Log };
