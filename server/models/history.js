'use strict';
module.exports = function(sequelize, DataTypes) {
  var History = sequelize.define('History', {
    Type: DataTypes.STRING,
    UserId: DataTypes.INTEGER,
    Description: DataTypes.TEXT
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return History;
};