const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Wallet = sequelize.define("Wallet", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    daily_points: { type: DataTypes.INTEGER, defaultValue: 0 },
    last_reset_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: "wallets" });

  return Wallet;
};
