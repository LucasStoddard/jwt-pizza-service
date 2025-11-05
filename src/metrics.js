// to run this just go node metrics.js
// this will likely need to be modified "because it will have to supply metrics for more than just HTTP requests"
// (the original code was copied over from metricsGenerator.js)
const config = require('./config');

const os = require('os');

// Okay to run this just node index.js
// then run the generatePizzaTraffic.sh with localhost

// Current dashboard:
    // HTTP                   (WORKING)
    // ACTIVE USERS           (WORKING)
    // AUTHENTICATION         (WORKING)
    // CPU (WORKING) MEMORY   (NOT WORKING)
    // PIZZAS                 (NOT WORKING)
    // SERVICE LATENCY        (WORKING)
    // PIZZA CREATION         (NOT WORKING)

// REQUIRED TODO:
    // HTTP:                                    (DONE)
        // Total requests / minute              (DONE)
        // get, post, put, and delete / minute  (DONE)
    // Active Users                             (DONE)
    // Authetication:                  (DONE)
        // Attempts / minute           (DONE)
        // Failures / minute           (DONE)
    // CPU and Memory Usage Percentage (DONE)
    // Pizzas:              (DONE)
        // Sold / minute    (DONE)
        // Failed / minute  (DONE)
        // revenue / minute (DONE)
    // Latency                      (DONE)
        // Service endpoint latency (DONE)
        // Pizza creation latency   (DONE)

let totalRequests = 0;
let totalGetRequests = 0;
let totalPostRequests = 0;
let totalPutRequests = 0;
let totalDeleteRequests = 0;

function requestTracker(req, res, next) {
    const startTime = process.hrtime.bigint();
    totalRequests++;
    const method = req.method.toUpperCase();
    switch (method) {
        case 'GET':
            totalGetRequests++;
            break;
        case 'POST':
            totalPostRequests++;
            break;
        case 'PUT':
            totalPutRequests++;
            break;
        case 'DELETE':
            totalDeleteRequests++;
            break;
    }
    res.on('close', () => {
        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1000000; 
        sendMetricToGrafana('request_latency', latencyMs, 'gauge', 'ms');
    });
    next();
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return parseFloat(memoryUsage.toFixed(2));
}

let pizzaSuccess = 0;
let pizzaFailure = 0;
let pizzaRevenue = 0;

function pizzaPurchase(success, latencyMs, price) {
  if (success) {
      pizzaSuccess++;
      pizzaRevenue += price;
  } else {
      pizzaFailure++;
  }
  // Instantly send latency
  sendMetricToGrafana('pizza_latency', latencyMs, 'gauge', 'ms');
}

let authSuccess = 0;
let authFailure = 0;

function authenticationAttempt(success) {
  if (success) {
      authSuccess++;
  } else {
      authFailure++;
  }
}

let currUsers = 0;

function currentUsers(login) {
    if (login) {
        currUsers++;
    } else {
        currUsers--;
    }
}

// for a second I thought I would calculate averages outside of grafana, but I will actually do it inside using RATE.
// FREQUENT REPORTS
setInterval(() => {
  let cpu_total = getCpuUsagePercentage();
  let memory_total = getMemoryUsagePercentage();
  sendMetricToGrafana('new_cpu_total', cpu_total, 'gauge', '1');
  sendMetricToGrafana('new_memory_total', memory_total, 'gauge', '%');
  sendMetricToGrafana('pizza_success_total', pizzaSuccess, 'sum', '1');
  sendMetricToGrafana('pizza_failures_total', pizzaFailure, 'sum', '1');
  sendMetricToGrafana('new_revenue_total', pizzaRevenue, 'sum', '1');
  sendMetricToGrafana('authentication_success_total', authSuccess, 'sum', '1');
  sendMetricToGrafana('authentication_failure_total', authFailure, 'sum', '1');
  sendMetricToGrafana('requests_total', totalRequests, 'sum', '1');
  sendMetricToGrafana('requests_get_total', totalGetRequests, 'sum', '1');
  sendMetricToGrafana('requests_post_total', totalPostRequests, 'sum', '1');
  sendMetricToGrafana('requests_put_total', totalPutRequests, 'sum', '1');
  sendMetricToGrafana('requests_delete_total', totalDeleteRequests, 'sum', '1');
  sendMetricToGrafana('current_users_total', currUsers, 'gauge', '1');
}, 1000);

function sendMetricToGrafana(metricName, metricValue, type, unit) {
  const valueKey = (type === 'sum' && Number.isInteger(Number(metricValue))) ? 'asInt' : 'asDouble';
  let finalMetricValue = Number(metricValue);

  const dataPoint = {
    [valueKey]: finalMetricValue,
    timeUnixNano: Date.now() * 1000000,
  };

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [dataPoint],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  if (type === 'sum') {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
  }

  const body = JSON.stringify(metric);
  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: body,
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
        });
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = {
    requestTracker: requestTracker,
    pizzaPurchase: pizzaPurchase,
    authenticationAttempt: authenticationAttempt,
    currentUsers: currentUsers,
    sendMetricToGrafana: sendMetricToGrafana,
};