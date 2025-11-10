const express = require('express');
const { authRouter, setAuthUser } = require('./routes/authRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const franchiseRouter = require('./routes/franchiseRouter.js');
const userRouter = require('./routes/userRouter.js');
const version = require('./version.json');
const config = require('./config.js');
const metrics = require('./metrics.js');
// const Logger = require('pizza-logger'); // NEW PIZZA LOGGER CODE
// const logger = new Logger(config); // NEW PIZZA LOGGER CODE

const app = express();

// app.use(logger.httpLogger); // NEW PIZZA LOGGER CODE

app.use((req, res, next) => { // NEW CODE
  const start = process.hrtime();
  metrics.incrementTotalRequests();
  const method = req.method;
  switch (method) {
    case 'GET':
      metrics.incrementGetRequests();
      break;
    case 'POST':
      metrics.incrementPostRequests();
      break;
    case 'PUT':
      metrics.incrementPutRequests();
      break;
    case 'DELETE':
      metrics.incrementDeleteRequests();
      break;
  }
  res.on('finish', () => {
    const end = process.hrtime(start);
    const latencyMs = (end[0] * 1000) + (end[1] / 1000000);
    metrics.updateMsRequestLatency(latencyMs);
  });
  next();
});

app.use(express.json());
app.use(setAuthUser);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

const apiRouter = express.Router();
app.use('/api', apiRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/order', orderRouter);
apiRouter.use('/franchise', franchiseRouter);

apiRouter.use('/docs', (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.docs, ...userRouter.docs, ...orderRouter.docs, ...franchiseRouter.docs],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'welcome to JWT Pizza',
    version: version.version,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'unknown endpoint',
  });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  next();
});

module.exports = app;
// module.exports.logger = logger;