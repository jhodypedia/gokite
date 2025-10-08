const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM("user","admin"), defaultValue: "user" }
  }, {
    tableName: "users"
  });

  User.prototype.setPassword = async function(pwd){
    this.password_hash = await bcrypt.hash(pwd, 10);
  };
  User.prototype.validatePassword = async function(pwd){
    return bcrypt.compare(pwd, this.password_hash);
  };

  return User;
};
