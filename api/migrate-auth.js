const backendHandler = require("./backend.js");

module.exports = async function handler(req, res) {
  req.url = "/api/migrate-auth";
  return backendHandler(req, res);
};
