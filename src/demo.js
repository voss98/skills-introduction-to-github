const { Timer } = require('./timer');

const timer = new Timer();

timer.start('pomodoro');

for (let i = 0; i < 5; i += 1) {
  timer.countTask();
}
