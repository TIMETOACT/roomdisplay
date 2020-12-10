const logger = require("pino")({
  customLevels: {
	  expresserr: 60
  }
});
module.exports = logger;
