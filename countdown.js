// TimeGuard - Countdown Page Script

// Configuration
const CIRCLE_RADIUS = 134;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// DOM Elements
const timerValue = document.getElementById('timerValue');
const destinationUrl = document.getElementById('destinationUrl');
const statsCount = document.getElementById('statsCount');
const statsMessage = document.getElementById('statsMessage');
const statsCard = document.getElementById('statsCard');
const progressCircle = document.querySelector('.progress-ring-circle');
const container = document.querySelector('.container');

// State
let targetUrl = null;
let targetDomain = null;
let totalSeconds = 30;
let remainingSeconds = 30;
let countdownInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Set up progress ring
  progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
  progressCircle.style.strokeDashoffset = 0;
  
  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  targetUrl = params.get('target');
  
  if (!targetUrl) {
    showError('No target URL specified');
    return;
  }
  
  try {
    const url = new URL(targetUrl);
    targetDomain = normalizeDomain(url.hostname);
    destinationUrl.textContent = targetDomain;
  } catch (e) {
    showError('Invalid target URL');
    return;
  }
  
  // Load settings and stats
  await loadSettings();
  await loadStats();
  
  // Start countdown
  startCountdown();
}

function normalizeDomain(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['delaySeconds']);
    totalSeconds = result.delaySeconds || 30;
    remainingSeconds = totalSeconds;
    updateTimerDisplay();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['accessLog']);
    const accessLog = result.accessLog || {};
    const domainLog = accessLog[targetDomain] || [];
    
    // Filter to last 24 hours
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const recentAccesses = domainLog.filter(timestamp => timestamp > twentyFourHoursAgo);
    
    updateStatsDisplay(recentAccesses.length);
  } catch (error) {
    console.error('Error loading stats:', error);
    updateStatsDisplay(0);
  }
}

function updateStatsDisplay(count) {
  statsCount.textContent = `${count} ${count === 1 ? 'visit' : 'visits'} in the last 24 hours`;
  
  // Remove existing state classes
  statsCard.classList.remove('excellent', 'caution', 'warning');
  
  if (count === 0) {
    statsCard.classList.add('excellent');
    statsMessage.textContent = "First visit today. Make it count!";
  } else if (count === 1) {
    statsCard.classList.add('excellent');
    statsMessage.textContent = "Just once today. You're doing great!";
  } else if (count <= 3) {
    statsCard.classList.add('excellent');
    statsMessage.textContent = "Staying in control. Keep it up!";
  } else if (count <= 6) {
    statsCard.classList.add('caution');
    statsMessage.textContent = "That's a few visits now. Still need this?";
  } else if (count <= 10) {
    statsCard.classList.add('caution');
    statsMessage.textContent = "Getting frequent. Consider taking a break.";
  } else if (count <= 15) {
    statsCard.classList.add('warning');
    statsMessage.textContent = "You've been here quite a bit today.";
  } else if (count <= 25) {
    statsCard.classList.add('warning');
    statsMessage.textContent = "That's a lot of visits. Maybe step away?";
  } else {
    statsCard.classList.add('warning');
    statsMessage.textContent = "Consider if this is how you want to spend your time.";
  }
}

function startCountdown() {
  updateTimerDisplay();
  updateProgressRing();
  
  countdownInterval = setInterval(() => {
    remainingSeconds--;
    
    if (remainingSeconds <= 0) {
      completeCountdown();
    } else {
      updateTimerDisplay();
      updateProgressRing();
      
      // Add pulse effect in last 5 seconds
      if (remainingSeconds <= 5) {
        timerValue.classList.add('pulse');
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  timerValue.textContent = remainingSeconds;
}

function updateProgressRing() {
  const progress = remainingSeconds / totalSeconds;
  const offset = CIRCLE_CIRCUMFERENCE * progress;
  progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE - offset;
}

async function completeCountdown() {
  clearInterval(countdownInterval);
  
  timerValue.textContent = '0';
  timerValue.classList.remove('pulse');
  container.classList.add('completed');
  progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
  
  // Log access
  await logAccess();
  
  // Notify background script that countdown completed
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.runtime.sendMessage({
        type: 'COUNTDOWN_COMPLETE',
        tabId: tabs[0].id,
        domain: targetDomain
      });
    }
  } catch (error) {
    console.error('Error notifying background:', error);
  }
  
  // Redirect after a brief moment
  setTimeout(() => {
    window.location.href = targetUrl;
  }, 300);
}

async function logAccess() {
  try {
    const result = await chrome.storage.local.get(['accessLog']);
    const accessLog = result.accessLog || {};
    
    if (!accessLog[targetDomain]) {
      accessLog[targetDomain] = [];
    }
    
    accessLog[targetDomain].push(Date.now());
    
    // Clean up old entries (older than 24 hours)
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    accessLog[targetDomain] = accessLog[targetDomain].filter(
      timestamp => timestamp > twentyFourHoursAgo
    );
    
    await chrome.storage.local.set({ accessLog });
  } catch (error) {
    console.error('Error logging access:', error);
  }
}

function showError(message) {
  timerValue.textContent = '!';
  destinationUrl.textContent = message;
  statsCard.style.display = 'none';
}

// Handle page visibility changes - if user navigates away, the countdown is lost
document.addEventListener('visibilitychange', () => {
  if (document.hidden && countdownInterval) {
    // User navigated away, countdown will restart next time
    clearInterval(countdownInterval);
  }
});

