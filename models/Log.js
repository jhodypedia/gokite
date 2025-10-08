const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Log = sequelize.define("Log", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    wallet: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    level: { type: DataTypes.ENUM("info","process","success","warning","error"), defaultValue: "info" }
  }, { tableName: "logs" });

  return Log;
};
