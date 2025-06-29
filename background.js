chrome.idle.setDetectionInterval(41 * 60);
let extFrom, extTo, popupTimer, exercisesList, countFrom, countTo, triggerChance, pwd;

let popupWindowId = null;
let popupExpiresAt = 0;
let isPaused = false;
let skipReopen = false;

chrome.storage.local.get({
  isPaused:     false,
  extFrom:      25,
  extTo:        40,
  popupTimer:   60,
  exercises:    'push ups,burpees,pull up,situps,stretches',
  countFrom:    3,
  countTo:      15,
  chance:       50,
  password:     'no'
}, prefs => {
  isPaused       = prefs.isPaused;
  extFrom        = prefs.extFrom;
  extTo          = prefs.extTo;
  popupTimer     = prefs.popupTimer;
  exercisesList  = prefs.exercises.split(',').map(s=>s.trim());
  countFrom      = prefs.countFrom;
  countTo        = prefs.countTo;
  triggerChance  = prefs.chance / 100;
  pwd            = prefs.password;

  updateIcon();   
  initialize();  
});

chrome.storage.onChanged.addListener(changes => {
  if (changes.chance) {
    triggerChance = changes.chance.newValue / 100;
    console.log('Updated triggerChance -', triggerChance);
  }

  if (changes.popupTimer) {
    popupTimer = changes.popupTimer.newValue;
    console.log('Updated popupTimer to', popupTimer, 'seconds');
  }
});

function updateIcon() {
  const sizes = [16, 32, 64, 128];
  const path = {};
  for (const s of sizes) {
    const file = isPaused
      ? `icons/iconPause${s}.png`
      : `icons/iconResume${s}.png`;
    path[s] = chrome.runtime.getURL(file);
  }
  chrome.action.setIcon({ path });
  console.log('Icon set to', isPaused ? 'PAUSE' : 'RESUME');
}


function openTimedPopup() {
  chrome.storage.local.get({ popupTimer: popupTimer }, prefs => {
    const durationMs = prefs.popupTimer * 1000;

    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      focused: true,
      width: 500,
      height: 500
    }, win => {
      popupWindowId  = win.id;
      popupExpiresAt = Date.now() + durationMs;
      chrome.storage.local.set({ popupActive: true }, () => {
        console.log('POPUP OPENED – expires at', new Date(popupExpiresAt));
      });
    });
  });
}


chrome.windows.onRemoved.addListener(id => {
  if (id !== popupWindowId) return;
  if (skipReopen) {
    skipReopen = false;
    return;
  }
  if (Date.now() < popupExpiresAt) {
    console.log('POPUP CLOSED EARLY – reopening');
    openTimedPopup();
  }
});


chrome.action.onClicked.addListener(() => {
  isPaused = !isPaused;
  chrome.storage.local.set({ isPaused });
  updateIcon();
  if (isPaused) pauseTimer();
  else resumeTimer();
  console.log('ACTION CLICKED – isPaused -', isPaused);
});


chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'popupClosed') {
    skipReopen = true;
    chrome.storage.local.set({ popupActive: false }, () => {
      const winId = popupWindowId;
      popupWindowId = null;
      popupExpiresAt = 0;
      if (winId) {
        chrome.windows.remove(winId);
      }
      console.log('POPUP CLOSED – removed and scheduling next');
      scheduleNextInterval();
    });
  }
});


function getRandomInterval() {
  return Math.random() * (extTo - extFrom) + extFrom;
}


function scheduleNextInterval() {
  const minutes = getRandomInterval();
  const nextTime = Date.now() + minutes * 60000;
  chrome.storage.local.set({
    nextAlarmTime: nextTime,
    popupActive: false
  }, () => {
    console.log(`SCHEDULE - next alarm in ${minutes} min at`, new Date(nextTime));
    updateIcon();
    chrome.alarms.create('interval', { when: nextTime });
  });
}


function initialize() {
  chrome.storage.local.get(['nextAlarmTime','popupActive'], data => {
    if (data.popupActive) {
      return;
    }

    const now = Date.now();

    if (data.nextAlarmTime && data.nextAlarmTime > now) {
      console.log('INIT - restoring alarm at', new Date(data.nextAlarmTime));
      chrome.alarms.create('interval', { when: data.nextAlarmTime });
    } else {
      console.log('INIT - scheduling first or overdue interval');
      scheduleNextInterval();
    }
  });
}

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);


function pauseTimer() {
  chrome.alarms.get('interval', alarm => {
    let remaining = 0;
    if (alarm) {
      remaining = alarm.scheduledTime - Date.now();
      chrome.alarms.clear('interval');
    }
    chrome.storage.local.set({ remainingTime: remaining }, () => {
      console.log('PAUSE - remaining', Math.round(remaining/1000), 's');
    });
  });
}


function resumeTimer() {
  if (isPaused) return;
  chrome.storage.local.get('remainingTime', ({ remainingTime }) => {
    const rem = remainingTime || 0;
    if (rem > 0) {
      const when = Date.now() + rem;
      chrome.alarms.create('interval', { when }, () => {
        chrome.storage.local.set({ nextAlarmTime: when }, () => {
          console.log('RESUME - next alarm at', new Date(when));
        });
      });
    } else {
      scheduleNextInterval();
    }
  });
}


chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== 'interval') return;
  console.log('ALARM FIRED at', new Date());
  chrome.storage.local.get('popupActive', ({ popupActive }) => {
    if (popupActive) return;
    const roll = Math.random();
    console.log('ROLL -', roll);
    if (roll <= triggerChance) { 
      console.log('ROLL OK - opening popup');
      chrome.storage.local.set({ popupActive: true }, openTimedPopup);
    } else {
      console.log('ROLL FAIL - reschedule');
      scheduleNextInterval();
    }
  });
});
