const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Interaction = sequelize.define("Interaction", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    wallet_id: { type: DataTypes.INTEGER, allowNull: false },
    question: { type: DataTypes.TEXT, allowNull: false },
    response: { type: DataTypes.TEXT, allowNull: true },
    ttft_ms: { type: DataTypes.FLOAT, defaultValue: 0 },
    total_ms: { type: DataTypes.FLOAT, defaultValue: 0 }
  }, { tableName: "interactions" });

  return Interaction;
};
