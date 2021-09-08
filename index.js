/**
 * Import dependencies
 */

const express = require('express');
const createHttpError = require('http-errors');
const winston = require('winston');
const axios = require('axios');
const path = require('path')

/**
 * Define HTTP status constants
 */

const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_METHOD_NOT_ALLOWED = 405;
const STATUS_INTERNAL_SERVER_ERROR = 500;

/**
 * Instantiate a config
 */

// NODE_ENV mode is passed as an option to this script, see `scripts` in `package.json`
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const config = {
  PORT: IS_PRODUCTION ? 80 : 80, // a port to listen to; if prod, then 80, and 3000 otherwise (had to change to 80 as tradingview only allows to send to port 80
  LOGS_FILE: 'logs.txt', // a file for logs to write to on production
  IPS: [
    'localhost',
    '::1',
    '127.0.0.1',
    '::ffff:52.89.214.238',
    '::ffff:34.212.75.30',
    '::ffff:54.218.53.128',
    '::ffff:52.32.178.7',
  ], // a white list of IPs to get requests from
  URL_TRADE: 'localhost:81/frostybot', // a URL for the trade webhook rule
  URL_EXIT: 'https://zignaly.com/api/signals.php', // a URL for the exit webhook rule
  URL_REVERSE_1: 'https://zignaly.com/api/signals.php', // a URL for the reverse composite webhook rule
  URL_REVERSE_2: 'https://zignaly.com/api/signals.php', // a URL for the reverse composite webhook rule
};

/**
 * Instantiate a logger
 */

const logger = new winston.createLogger({
  // if production, then write logs to disk, otherwise - to console
  transports: IS_PRODUCTION
    ? new winston.transports.File({ filename: path.join(__dirname, config.LOGS_FILE) })
    : new winston.transports.Console(),
  // simple format like "error: ..." or "info: ..."
  format: winston.format.simple(),
});

/**
 * Instantiate a server
 */

 const server = express();

/**
 * Register middlewares
 *
 * They are applied for every requests and MUST be registered before any controllers
 */

// block requests from unknown IPs
server.use((request, response, next) => {
  // if an IP isn't in the white list
  if (!config.IPS.includes(request.ip)) {
    // then raise an error
    next(createHttpError(STATUS_FORBIDDEN));
    // and terminate
    return;
  }

  // otherwise continue
  next();
});

// parse the body of a request
server.use(express.text({
  // max size is 100kb
  limit: '100kb',
  // accept any content types even blank
  type: '*/*',
}));

/**
 * Register controllers
 *
 * Each is applied for certain methods and paths, activated in order
 */

// handle POST requests to the / path
server.post('/', async (request, response, next) => {
  // get the body
  const { body } = request;

  // if the body is empty
  if (typeof body !== 'string' || !body.length) {
    // then raise a bad request error
    next(createHttpError(STATUS_BAD_REQUEST));
    // and terminate
    return;
  }

  // log the body
  logger.info(`Received from IP ${request.ip} at ${new Date().toISOString()} webhook content ${body}`);

  // if the body starts with 'trade:'
  if (body.startsWith('trade:')) {
    // try sending a request
    try {
      await axios({
        url: config.URL_TRADE,
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        data: body,
      });

      logger.info(`Sent to config.URL_TRADE at ${new Date().toISOString()} webhook content ${body}`);

    // if error
    } catch (err) {
      // then raise an internal server error
      next(createHttpError(STATUS_INTERNAL_SERVER_ERROR));
      // and terminate
      logger.info(`Error sending trade:`);

      return;
    }

    // respond with 200 OK on success
    response.sendStatus(STATUS_OK);
    // and terminate
    return;
  }

  let jsonBody = {};

  // try parsing the body as JSON
  try {
    jsonBody = JSON.parse(body);
  // if error
  } catch (err) {
    // then raise a bad request error
    next(createHttpError(STATUS_BAD_REQUEST));
    // and terminate
    return;
  }

  // if the body JSON has a field 'type' equal to 'exit'
  if (jsonBody.type === 'exit') {
    // try sending a request
    try {
      await axios({
        url: config.URL_EXIT,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: body,
      });
    // if error
    } catch (err) {
      // then raise an internal server error
      next(createHttpError(STATUS_INTERNAL_SERVER_ERROR));
      // and terminate
      return;
    }

    // respond with 200 OK on success
    response.sendStatus(STATUS_OK);
    return;
  }

  // if the body JSON contains a field type equal to 'reverse'
  if (jsonBody.type === 'reverse') {
    // try sending a request
    try {
      await axios({
        url: config.URL_REVERSE_1,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: {
          key: jsonBody.key,
          pair: jsonBody.pair,
          exchange: jsonBody.exchange,
          exchangeAccountType: jsonBody.exchangeAccountType,
          signalId: jsonBody.signalId,
          orderType: 'market',
          type: 'exit',
        },
      });
    // if error
    } catch (err) {
      // then raise an internal server errror
      next(createHttpError(STATUS_INTERNAL_SERVER_ERROR));
      // and terminate
      return;
    }

    // wait for 2*60*1000 miliseconds
    await new Promise((res) => setTimeout(() => res(), 2 * 60 * 1000));

    // try sending a request
    try {
      await axios({
        url: config.URL_REVERSE_2,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: {
          key: jsonBody.key,
          pair: jsonBody.pair,
          exchange: jsonBody.exchange,
          exchangeAccountType: jsonBody.exchangeAccountType,
          positionSizePercentage: jsonBody.positionSizePercentage,
          signalId: jsonBody.signalId,
          side: jsonBody.entrySide,
          orderType: jsonBody.entryOrderType,
          leverage: jsonBody.entryLeverage,
        },
      });
    // if error
    } catch (err) {
      // then raise an internal server error
      next(createHttpError(STATUS_INTERNAL_SERVER_ERROR));
      // and terminate
      return;
    }

    // respond with 200 OK on success
    response.sendStatus(STATUS_OK);
    // and terminate
    return
  }

  // raise an error if the body doesn't meet any of the above conditions
  next(createHttpError(STATUS_BAD_REQUEST));
});

// handle requests of other methods to the / path
server.all('/', (request, response, next) => {
  // raise a method not allowed error
  next(createHttpError(STATUS_METHOD_NOT_ALLOWED));
});

// handle requests for paths other than the / path
server.use((request, response, next) => {
  // raise a not found error
  next(createHttpError(STATUS_NOT_FOUND));
});

// handle any errors
server.use((error, request, response, next) => {
  // log the error
  logger.error(`${error.message} at ${new Date().toISOString()}`);
  // respond with the status of an error or 500 if it doesn't have it
  response.sendStatus(error.status || STATUS_INTERNAL_SERVER_ERROR);
});

// start the server
server.listen(config.PORT, () => {
  // just log this line
  logger.info(`Started on port: ${config.PORT}`);
});

/**
 * Register safe process listeners
 */

// catch sync errors
process.on('uncaughtException', (error) => {
  logger.error(`Stopped by error: ${error.toString()}`);
  // terminate with error
  process.exit(1);
});

// catch async errors
process.on('unhandledRejection', (reason) => {
  logger.error(`Stopped by reason: ${reason}`);
  // terminate with error
  process.exit(1);
});

// catch when you press CTRL+C in terminal
process.on('SIGINT', (signal) => {
  logger.info(`Stopped by signal: ${signal}`);
  // exit w/o error
  process.exit(0);
});

// similar to the above but more low level
process.on('SIGTERM', (signal) => {
  logger.info(`Stopped by signal: ${signal}`);
  // exit w/o error
  process.exit(0);
});
