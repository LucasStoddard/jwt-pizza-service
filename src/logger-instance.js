const config = require('./config');
const Logger = require('./logger'); // The class definition

const logger = new Logger(config);

module.exports = logger;