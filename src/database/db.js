const { Sequelize } = require('sequelize');

module.exports = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOSTNAME,
    port: process.env.DB_PORT,
    maxConcurrentQueries: 100,
    dialect: 'mariadb',
    pool: { maxConnections: 5, maxIdleTime: 1 },
    language: 'en',
  }
);
