/**
 * Minimal analytics client.
 *
 * Events are appended to an in-memory log and echoed to the console.
 * Swap `logEvent`'s console.log call for a real transport (HTTP call,
 * SDK, etc.) when a backend is available.
 */

const events = [];

function logEvent(name, properties = {}) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('logEvent: "name" must be a non-empty string');
  }
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    throw new TypeError('logEvent: "properties" must be a plain object');
  }

  const event = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  events.push(event);
  console.log(`[analytics] ${event.name}`, event.properties);

  return event;
}

function getEvents() {
  return events.slice();
}

function clearEvents() {
  events.length = 0;
}

module.exports = { logEvent, getEvents, clearEvents };
