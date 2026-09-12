const analytics = require('./analytics');

const PRESETS = {
  pomodoro: 1500,
  short_break: 300,
  long_break: 900,
};

class Timer {
  constructor() {
    this.taskCount = 0;
  }

  start(preset = 'pomodoro') {
    const duration_seconds = PRESETS[preset];
    if (duration_seconds === undefined) {
      throw new RangeError(`Unknown timer preset: "${preset}"`);
    }

    analytics.logEvent('timer_started', { duration_seconds, preset });

    return duration_seconds;
  }

  countTask() {
    this.taskCount += 1;
    analytics.logEvent('task_counted', { task_count: this.taskCount });
    return this.taskCount;
  }
}

module.exports = { Timer, PRESETS };
