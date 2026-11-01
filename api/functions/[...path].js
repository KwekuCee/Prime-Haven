const backendHandler = require("../backend.js");

module.exports = async function handler(req, res) {
  return backendHandler(req, res);
};
