document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get({
    popupTimer: 60,
    exercises: 'push ups,burpees,pull up,sit ups,stretches',
    countFrom: 3,
    countTo: 15,
    password: 'no'
  }, prefs => {
    const timerDuration  = prefs.popupTimer;
    const exercisesList  = prefs.exercises.split(',').map(s => s.trim()).filter(s => s);
    const countFrom      = prefs.countFrom;
    const countTo        = prefs.countTo;
    const password       = prefs.password;

    const messageEl   = document.getElementById('message');
    const countdownEl = document.getElementById('countdown');
    const form        = document.getElementById('pw-form');
    const input       = document.getElementById('pw-input');

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    chrome.storage.local.get(['currentExercise','currentCount'], data => {
      let exercise = data.currentExercise;
      let count    = data.currentCount;
      if (!exercise || !count) {
        exercise = exercisesList[Math.floor(Math.random() * exercisesList.length)];
        count    = Math.floor(Math.random() * (countTo - countFrom + 1)) + countFrom;
        chrome.storage.local.set({ currentExercise: exercise, currentCount: count });
      }
      messageEl.textContent = `Get up and do ${count} of ${exercise}`;

      let remaining = timerDuration;
      countdownEl.textContent = remaining;
      const timerId = setInterval(() => {
        remaining--;
        countdownEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(timerId);
          chrome.runtime.sendMessage({ type: 'popupClosed' });
          chrome.storage.local.remove(['currentExercise','currentCount']);
        }
      }, 1000);

      form.addEventListener('submit', e => {
        e.preventDefault();
        if (input.value === password) {
          clearInterval(timerId);
          chrome.runtime.sendMessage({ type: 'popupClosed' });
          chrome.storage.local.remove(['currentExercise','currentCount']);
        }
      });
    });
  });
});
