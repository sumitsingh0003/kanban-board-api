const { logger } = require('../utils/logger');

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info(`Incoming ${req.method} request`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  }, req);

  // Capture response
  const originalJson = res.json;
  res.json = function(data) {
    res.locals.responseData = data;
    return originalJson.call(this, data);
  };

  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.api(req, res, responseTime);
    
    if (res.statusCode >= 400) {
      logger.warn('Request failed', {
        statusCode: res.statusCode,
        response: res.locals.responseData
      }, req);
    }
  });

  next();
};

module.exports = loggerMiddleware;