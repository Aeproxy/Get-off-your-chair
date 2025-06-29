document.addEventListener('DOMContentLoaded', () => {
  const defaults = {
    extFrom: 25,
    extTo: 40,
    popupTimer: 60,
    exercises: 'push ups,burpees,pull up,sit ups,stretches',
    countFrom: 3,
    countTo: 15,
    chance: 50,
    password: 'no'
  };
  chrome.storage.local.get(defaults, prefs => {
    document.getElementById('ext-from').value    = prefs.extFrom;
    document.getElementById('ext-to').value      = prefs.extTo;
    document.getElementById('popup-timer').value = prefs.popupTimer;
    document.getElementById('exercises').value   = prefs.exercises;
    document.getElementById('count-from').value  = prefs.countFrom;
    document.getElementById('count-to').value    = prefs.countTo;
    document.getElementById('chance').value      = prefs.chance;
    document.getElementById('password').value    = prefs.password;
  });

  document.getElementById('settings-form').addEventListener('submit', e => {
    e.preventDefault();
    const newPrefs = {
      extFrom:    parseInt(document.getElementById('ext-from').value, 10),
      extTo:      parseInt(document.getElementById('ext-to').value, 10),
      popupTimer: parseInt(document.getElementById('popup-timer').value, 10),
      exercises:  document.getElementById('exercises').value,
      countFrom:  parseInt(document.getElementById('count-from').value, 10),
      countTo:    parseInt(document.getElementById('count-to').value, 10),
      chance:     parseInt(document.getElementById('chance').value, 10),
      password:   document.getElementById('password').value
    };
    chrome.storage.local.set(newPrefs, () => {
      const status = document.createElement('div');
      status.textContent = 'Settings saved';
      document.body.appendChild(status);
      setTimeout(() => status.remove(), 1500);
    });
  });
});