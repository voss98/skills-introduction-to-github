/**
 * Minimal analytics client (browser build).
 *
 * Mirrors src/analytics.js but exposes itself as a global instead of a
 * CommonJS export, and notifies subscribers so the UI can render a log.
 */

const events = [];
const subscribers = [];

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
  subscribers.forEach((fn) => fn(event));

  return event;
}

function getEvents() {
  return events.slice();
}

function onEvent(fn) {
  subscribers.push(fn);
}

window.analytics = { logEvent, getEvents, onEvent };
