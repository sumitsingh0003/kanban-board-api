const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');
const errorFile = path.join(logsDir, 'error.log');

const levels = {
  INFO: 'INFO',
  ERROR: 'ERROR',
  WARN: 'WARN',
  DEBUG: 'DEBUG',
  API: 'API',
  SOCKET: 'SOCKET'
};

const colors = {
  INFO: '\x1b[36m',    // Cyan
  ERROR: '\x1b[31m',   // Red
  WARN: '\x1b[33m',    // Yellow
  DEBUG: '\x1b[35m',   // Magenta
  API: '\x1b[32m',     // Green
  SOCKET: '\x1b[34m',  // Blue
  RESET: '\x1b[0m'
};

const writeToFile = (filePath, message) => {
  fs.appendFileSync(filePath, message + '\n', 'utf8');
};

const formatMessage = (level, message, data = {}, req = null) => {
  const timestamp = new Date().toISOString();
  
  let logEntry = {
    timestamp,
    level,
    message,
    ...data
  };

  if (req) {
    logEntry = {
      ...logEntry,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?._id,
      userEmail: req.user?.email
    };
  }

  return JSON.stringify(logEntry);
};

exports.logger = {
  info: (message, data = {}, req = null) => {
    const logMsg = formatMessage(levels.INFO, message, data, req);
    console.log(`${colors.INFO}[${new Date().toLocaleTimeString()}] INFO: ${message}${colors.RESET}`, data);
    writeToFile(logFile, logMsg);
  },

  error: (message, error = null, data = {}, req = null) => {
    const errorData = {
      ...data,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorCode: error?.code
    };
    const logMsg = formatMessage(levels.ERROR, message, errorData, req);
    console.error(`${colors.ERROR}[${new Date().toLocaleTimeString()}] ERROR: ${message}${colors.RESET}`, errorData);
    writeToFile(errorFile, logMsg);
    writeToFile(logFile, logMsg);
  },

  warn: (message, data = {}, req = null) => {
    const logMsg = formatMessage(levels.WARN, message, data, req);
    console.warn(`${colors.WARN}[${new Date().toLocaleTimeString()}] WARN: ${message}${colors.RESET}`, data);
    writeToFile(logFile, logMsg);
  },

  debug: (message, data = {}, req = null) => {
    if (process.env.NODE_ENV === 'development') {
      const logMsg = formatMessage(levels.DEBUG, message, data, req);
      console.debug(`${colors.DEBUG}[${new Date().toLocaleTimeString()}] DEBUG: ${message}${colors.RESET}`, data);
      writeToFile(logFile, logMsg);
    }
  },

  api: (req, res, responseTime) => {
    const data = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userId: req.user?._id
    };
    const logMsg = formatMessage(levels.API, `${req.method} ${req.url}`, data);
    console.log(`${colors.API}[${new Date().toLocaleTimeString()}] API: ${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)${colors.RESET}`);
    writeToFile(logFile, logMsg);
  },

  socket: (event, data = {}, socketId = null) => {
    const logData = {
      event,
      socketId,
      ...data
    };
    const logMsg = formatMessage(levels.SOCKET, `Socket: ${event}`, logData);
    console.log(`${colors.SOCKET}[${new Date().toLocaleTimeString()}] SOCKET: ${event}${colors.RESET}`, data);
    writeToFile(logFile, logMsg);
  }
};