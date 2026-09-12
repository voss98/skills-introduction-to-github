const PRESETS = {
  pomodoro: 1500,
  short_break: 300,
  long_break: 900,
};

class Timer {
  constructor(onTick) {
    this.taskCount = 0;
    this.remaining = 0;
    this.intervalId = null;
    this.onTick = onTick || (() => {});
  }

  start(preset = 'pomodoro') {
    const duration_seconds = PRESETS[preset];
    if (duration_seconds === undefined) {
      throw new RangeError(`Unknown timer preset: "${preset}"`);
    }

    window.analytics.logEvent('timer_started', { duration_seconds, preset });

    this.stop();
    this.remaining = duration_seconds;
    this.onTick(this.remaining);
    this.intervalId = setInterval(() => {
      this.remaining -= 1;
      this.onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
      }
    }, 1000);

    return duration_seconds;
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  countTask() {
    this.taskCount += 1;
    window.analytics.logEvent('task_counted', { task_count: this.taskCount });
    return this.taskCount;
  }
}

window.Timer = Timer;
window.TIMER_PRESETS = PRESETS;
