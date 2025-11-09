const config = require('./config.js');

const os = require('os');

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.getRequests = 0;
    this.putRequests = 0;
    this.postRequests = 0;
    this.deleteRequests = 0;

    // this.getHomePageRequests = 0;

    this.activeUsers = 0;
    this.successfulAuth = 0;
    this.failedAuth = 0;

    this.cpuPercentage = 0.0;
    this.memoryPercentage = 0.0;

    this.pizzas = 0;
    this.creationFailures = 0;
    this.revenue = 0.0;

    this.pizzaCreationLatency = 0.0;
    this.msRequestLatency = 0.0;
  }

  incrementTotalRequests() { // DONE
    this.totalRequests++;
  }

  incrementGetRequests() { // DONE
    this.getRequests++;
  }

  incrementPutRequests() { // DONE
    this.putRequests++;
  }

  incrementPostRequests() { // DONE
    this.postRequests++;
  }

  incrementDeleteRequests() { // DONE
    this.deleteRequests++;
  }

  // incrementGetHomePageRequests() {
  //   this.getHomePageRequests++;
  // }

  incrementSuccessfulAuth() { // DONE
    this.successfulAuth++;
  }

  incrementFailedAuth() { // DONE
    this.failedAuth++;
  }

  incrementActiveUsers() { // DONE
    this.activeUsers++;
  }

  decrementActiveUsers() { // DONE
    this.activeUsers--;
  }

  getCpuUsagePercentage() { // CHANGED
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  getMemoryUsagePercentage() { // CHANGED
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return parseFloat(memoryUsage.toFixed(2));
  }

  incrementTotalPizzas() { // DONE
    this.pizzas++;
  }

  incrementCreationFailures() { // DONE
    this.creationFailures++;
  }

  updateTotalRevenue(revenue) { // DONE
    this.revenue += revenue;
  }

  updatePizzaCreationLatency(pizzaCreationLatency) { // DONE
    this.pizzaCreationLatency = pizzaCreationLatency;
  }

  updateMsRequestLatency(msRequestLatency) { // DONE
    // console.log(`Updating msRequestLatency to: ${msRequestLatency}`);
    if (msRequestLatency != 0)
      this.msRequestLatency = msRequestLatency;
  }

  clearAllMetrics() {
    this.totalRequests = 0;
    this.getRequests = 0;
    this.putRequests = 0;
    this.postRequests = 0;
    this.deleteRequests = 0;
    // this.getHomePageRequests = 0;

    this.successfulAuth = 0;
    this.failedAuth = 0;

    this.cpuPercentage = 0;
    this.memoryPercentage = 0.0;

    // this.pizzas = 0;
    this.creationFailures = 0;
    // this.revenue = 0.0;

    // this.pizzaCreationLatency = 0.0;
    // this.msRequestLatency = 0.0;
  }

sendMetricToGrafana(metricName, metricValue, type, unit) {
    let finalMetricValue = Number(metricValue);
    
    // Determine the key and ensure the value is explicitly assigned.
    const isInteger = type === 'sum' && Number.isInteger(finalMetricValue);
    const valueKey = isInteger ? 'asInt' : 'asDouble';

    // OTLP Data Point structure - only include the relevant key
    const dataPoint = {
        timeUnixNano: Date.now() * 1000000,
    };

    // Assign the value to the correct key.
    dataPoint[valueKey] = finalMetricValue;

    // OTLP Metric structure
    const metricPayload = {
      resourceMetrics: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: {
                  stringValue: config.metrics.source
                }
              }
            ]
          },
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
      metricPayload.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
      metricPayload.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
    }

    const body = JSON.stringify(metricPayload);

    fetch(`${config.metrics.url}`, {
      method: 'POST',
      body: body,
      headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          // CORRECT DEBUGGING from old file
          response.text().then((text) => {
            console.error(`Failed to push metrics data to Grafana (HTTP ${response.status}): ${text}\nPayload for ${metricName}: ${body}`);
          });
        } else {
          console.log(`Pushed ${metricName}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
}

// class MetricsBuilder {
//   constructor() {
//     this.metricList = "";
//   }

//   addMetric(metricPrefix, method, metricValue) {
//     this.metricList += `${metricPrefix},source=${config.metrics.source},method=${method} total=${metricValue} \n`;
//   }

//   toString() {
//     return this.metricList;
//   }
// }

const metrics = new Metrics();
module.exports = metrics;

function systemMetrics() {
  const cpu = metrics.getCpuUsagePercentage();
  const memory = metrics.getMemoryUsagePercentage();
  metrics.sendMetricToGrafana('new_cpu_total', cpu, 'gauge', '%');
  metrics.sendMetricToGrafana('new_memory_total', memory, 'gauge', '%');
}

function httpMetrics() {
  metrics.sendMetricToGrafana('requests_total', metrics.totalRequests, 'sum', '1');
  metrics.sendMetricToGrafana('requests_get_total', metrics.getRequests, 'sum', '1');
  metrics.sendMetricToGrafana('requests_put_total', metrics.putRequests, 'sum', '1');
  metrics.sendMetricToGrafana('requests_post_total', metrics.postRequests, 'sum', '1');
  metrics.sendMetricToGrafana('requests_delete_total', metrics.deleteRequests, 'sum', '1');
}

function authMetrics() {
  metrics.sendMetricToGrafana('current_users_total', metrics.activeUsers, 'gauge', '1');
  metrics.sendMetricToGrafana('authentication_success_total', metrics.successfulAuth, 'sum', '1');
  metrics.sendMetricToGrafana('authentication_failure_total', metrics.failedAuth, 'sum', '1');
}

function purchaseMetrics() {
  metrics.sendMetricToGrafana('pizza_success_total', metrics.pizzas, 'sum', '1');
  metrics.sendMetricToGrafana('pizza_failures_total', metrics.creationFailures, 'sum', '1');
  metrics.sendMetricToGrafana('new_revenue_total', metrics.revenue, 'sum', '1');
}

function latencyMetrics() {
  // These are 'gauge' in the old file, which means the last recorded value is sent.
  metrics.sendMetricToGrafana('pizza_latency', metrics.pizzaCreationLatency, 'gauge', 'ms');
  metrics.sendMetricToGrafana('request_latency', metrics.msRequestLatency, 'gauge', 'ms');
}

function sendMetricsPeriodically(period) {
  setInterval(() => {
    try {
      httpMetrics();
      authMetrics();
      systemMetrics();
      purchaseMetrics();
      latencyMetrics();
      metrics.clearAllMetrics(); 

    } catch (error) {
      console.log('Error sending metrics', error);
    }
  }, period);
}

sendMetricsPeriodically(10000);