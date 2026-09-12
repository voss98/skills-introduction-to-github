const clockEl = document.getElementById('clock');
const startBtn = document.getElementById('start-btn');
const taskBtn = document.getElementById('task-btn');
const taskCountEl = document.getElementById('task-count');
const eventLogEl = document.getElementById('event-log');
const presetButtons = document.querySelectorAll('.preset');

let currentPreset = 'pomodoro';

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.max(totalSeconds, 0) % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const timer = new Timer((remaining) => {
  clockEl.textContent = formatTime(remaining);
});

clockEl.textContent = formatTime(window.TIMER_PRESETS[currentPreset]);

presetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentPreset = btn.dataset.preset;
    presetButtons.forEach((b) => b.classList.toggle('active', b === btn));
    timer.stop();
    clockEl.textContent = formatTime(window.TIMER_PRESETS[currentPreset]);
  });
});

startBtn.addEventListener('click', () => {
  timer.start(currentPreset);
});

taskBtn.addEventListener('click', () => {
  const count = timer.countTask();
  taskCountEl.textContent = count;
});

window.analytics.onEvent((event) => {
  const li = document.createElement('li');
  li.innerHTML = `<span class="event-name">${event.name}</span> ${JSON.stringify(event.properties)}`;
  eventLogEl.prepend(li);
});
