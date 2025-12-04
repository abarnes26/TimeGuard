// TimeGuard - Options Page Script

const DEFAULT_DELAY = 30;
const MIN_DELAY = 1;
const MAX_DELAY = 300;

// State
let blockedSites = [];
let delaySeconds = DEFAULT_DELAY;
let rehabMode = {
  enabled: false,
  startTime: '23:00',
  endTime: '00:00'
};
let originalSettings = { 
  blockedSites: [], 
  delaySeconds: DEFAULT_DELAY,
  rehabMode: { enabled: false, startTime: '23:00', endTime: '00:00' }
};
let editingIndex = -1;
let pendingRehabEnable = false;

// DOM Elements
const delayInput = document.getElementById('delaySeconds');
const decreaseBtn = document.getElementById('decreaseDelay');
const increaseBtn = document.getElementById('increaseDelay');
const delayLockedNotice = document.getElementById('delayLockedNotice');
const newSiteInput = document.getElementById('newSiteInput');
const addSiteBtn = document.getElementById('addSiteBtn');
const sitesList = document.getElementById('sitesList');
const emptyState = document.getElementById('emptyState');
const sitesLockedNotice = document.getElementById('sitesLockedNotice');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveStatus = document.getElementById('saveStatus');
const editModal = document.getElementById('editModal');
const editSiteInput = document.getElementById('editSiteInput');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Rehab Mode Elements
const rehabModeEnabled = document.getElementById('rehabModeEnabled');
const rehabSettings = document.getElementById('rehabSettings');
const rehabStartTime = document.getElementById('rehabStartTime');
const rehabEndTime = document.getElementById('rehabEndTime');
const rehabStatus = document.getElementById('rehabStatus');
const rehabLockedNotice = document.getElementById('rehabLockedNotice');
const rehabWarningModal = document.getElementById('rehabWarningModal');
const cancelRehabBtn = document.getElementById('cancelRehabBtn');
const confirmRehabBtn = document.getElementById('confirmRehabBtn');

// Initialize
document.addEventListener('DOMContentLoaded', loadSettings);

// Event Listeners
decreaseBtn.addEventListener('click', () => {
  if (isDecreaseAllowed()) {
    adjustDelay(-5);
  }
});
increaseBtn.addEventListener('click', () => adjustDelay(5));
delayInput.addEventListener('change', handleDelayInput);
delayInput.addEventListener('blur', handleDelayInput);

addSiteBtn.addEventListener('click', addSite);
newSiteInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addSite();
});

saveBtn.addEventListener('click', saveSettings);
cancelBtn.addEventListener('click', cancelChanges);

saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});
editSiteInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveEdit();
});

// Rehab Mode Event Listeners
rehabModeEnabled.addEventListener('change', handleRehabToggle);
rehabStartTime.addEventListener('change', updateRehabStatus);
rehabEndTime.addEventListener('change', updateRehabStatus);
cancelRehabBtn.addEventListener('click', cancelRehabWarning);
confirmRehabBtn.addEventListener('click', confirmRehabEnable);
rehabWarningModal.addEventListener('click', (e) => {
  if (e.target === rehabWarningModal) cancelRehabWarning();
});

// ==================== Time Window Functions ====================

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isWithinTimeWindow(startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const current = getCurrentTimeMinutes();
  
  // Handle overnight windows (e.g., 23:00 to 00:00)
  if (start > end) {
    // Window spans midnight
    return current >= start || current < end;
  } else if (start === end) {
    // Same time means always open (edge case)
    return true;
  } else {
    // Normal window (e.g., 09:00 to 17:00)
    return current >= start && current < end;
  }
}

function isEditingAllowed() {
  // If rehab mode is not enabled (in saved settings), editing is always allowed
  if (!originalSettings.rehabMode.enabled) {
    return true;
  }
  // If rehab mode is enabled, check if we're in the time window
  return isWithinTimeWindow(originalSettings.rehabMode.startTime, originalSettings.rehabMode.endTime);
}

function isDecreaseAllowed() {
  return isEditingAllowed();
}

function isSiteEditDeleteAllowed() {
  return isEditingAllowed();
}

function isRehabSettingsEditable() {
  return isEditingAllowed();
}

// ==================== UI Update Functions ====================

function updateRestrictionUI() {
  const canEdit = isEditingAllowed();
  const rehabEnabled = originalSettings.rehabMode.enabled;
  
  // Delay decrease button
  if (rehabEnabled && !canEdit) {
    decreaseBtn.classList.add('disabled');
    decreaseBtn.disabled = true;
    delayLockedNotice.classList.add('visible');
  } else {
    decreaseBtn.classList.remove('disabled');
    decreaseBtn.disabled = false;
    delayLockedNotice.classList.remove('visible');
  }
  
  // Sites locked notice
  if (rehabEnabled && !canEdit) {
    sitesLockedNotice.classList.add('visible');
  } else {
    sitesLockedNotice.classList.remove('visible');
  }
  
  // Rehab mode controls
  if (rehabEnabled && !canEdit) {
    rehabModeEnabled.disabled = true;
    rehabStartTime.disabled = true;
    rehabEndTime.disabled = true;
    rehabLockedNotice.classList.add('visible');
    document.querySelector('.rehab-section').classList.add('locked');
  } else {
    rehabModeEnabled.disabled = false;
    rehabStartTime.disabled = false;
    rehabEndTime.disabled = false;
    rehabLockedNotice.classList.remove('visible');
    document.querySelector('.rehab-section').classList.remove('locked');
  }
  
  // Re-render sites list to update edit/delete buttons
  renderSitesList();
}

function updateRehabStatus() {
  if (!rehabMode.enabled) {
    rehabStatus.innerHTML = '';
    rehabSettings.classList.remove('expanded');
    return;
  }
  
  rehabSettings.classList.add('expanded');
  
  const startTime = rehabStartTime.value;
  const endTime = rehabEndTime.value;
  const isOpen = isWithinTimeWindow(startTime, endTime);
  
  const startFormatted = formatTime(startTime);
  const endFormatted = formatTime(endTime);
  
  // Check if rehab mode is saved or just pending
  const isSaved = originalSettings.rehabMode.enabled;
  
  if (isOpen) {
    rehabStatus.innerHTML = `
      <div class="status-badge open">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4" fill="currentColor"/>
        </svg>
        Edit window is open
      </div>
      <p class="status-detail">${isSaved ? 'You can modify all settings until' : 'After saving, you can modify settings until'} ${endFormatted}</p>
    `;
  } else {
    rehabStatus.innerHTML = `
      <div class="status-badge ${isSaved ? 'closed' : 'pending'}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4" fill="currentColor"/>
        </svg>
        ${isSaved ? 'Edit window is closed' : 'Pending activation'}
      </div>
      <p class="status-detail">${isSaved ? 'Settings locked until' : 'After saving, settings will lock until'} ${startFormatted}</p>
    `;
  }
}

function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ==================== Rehab Mode Handlers ====================

function handleRehabToggle() {
  if (rehabModeEnabled.checked && !originalSettings.rehabMode.enabled) {
    // User is trying to enable rehab mode - show warning
    pendingRehabEnable = true;
    rehabWarningModal.classList.add('visible');
    // Reset checkbox until confirmed
    rehabModeEnabled.checked = false;
  } else {
    rehabMode.enabled = rehabModeEnabled.checked;
    updateRehabStatus();
  }
}

function cancelRehabWarning() {
  pendingRehabEnable = false;
  rehabWarningModal.classList.remove('visible');
  rehabModeEnabled.checked = false;
}

function confirmRehabEnable() {
  pendingRehabEnable = false;
  rehabWarningModal.classList.remove('visible');
  rehabModeEnabled.checked = true;
  rehabMode.enabled = true;
  updateRehabStatus();
}

// ==================== Core Functions ====================

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['blockedSites', 'delaySeconds', 'rehabMode']);
    blockedSites = result.blockedSites || [];
    delaySeconds = result.delaySeconds || DEFAULT_DELAY;
    rehabMode = result.rehabMode || { enabled: false, startTime: '23:00', endTime: '00:00' };
    
    // Store original settings for cancel functionality and restriction checks
    originalSettings = {
      blockedSites: [...blockedSites],
      delaySeconds: delaySeconds,
      rehabMode: { ...rehabMode }
    };
    
    updateUI();
    updateRestrictionUI();
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

function updateUI() {
  delayInput.value = delaySeconds;
  rehabModeEnabled.checked = rehabMode.enabled;
  rehabStartTime.value = rehabMode.startTime;
  rehabEndTime.value = rehabMode.endTime;
  renderSitesList();
  updateRehabStatus();
}

function adjustDelay(amount) {
  const newValue = delaySeconds + amount;
  
  // Check restrictions
  if (amount < 0 && !isDecreaseAllowed()) {
    showStatus('Cannot decrease delay outside edit window', 'error');
    return;
  }
  
  const clampedValue = Math.min(MAX_DELAY, Math.max(MIN_DELAY, newValue));
  delaySeconds = clampedValue;
  delayInput.value = clampedValue;
}

function handleDelayInput() {
  let value = parseInt(delayInput.value, 10);
  if (isNaN(value)) value = DEFAULT_DELAY;
  
  // Check if trying to decrease when not allowed
  if (!isDecreaseAllowed() && value < originalSettings.delaySeconds) {
    value = originalSettings.delaySeconds;
    showStatus('Cannot decrease delay outside edit window', 'error');
  }
  
  value = Math.min(MAX_DELAY, Math.max(MIN_DELAY, value));
  delaySeconds = value;
  delayInput.value = value;
}

function normalizeDomain(input) {
  let domain = input.toLowerCase().trim();
  
  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '');
  
  // Remove www. prefix
  domain = domain.replace(/^www\./, '');
  
  // Remove trailing slash and path
  domain = domain.split('/')[0];
  
  // Remove port if present
  domain = domain.split(':')[0];
  
  return domain;
}

function isValidDomain(domain) {
  if (!domain) return false;
  // Basic domain validation
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

function addSite() {
  const domain = normalizeDomain(newSiteInput.value);
  
  if (!domain) {
    showStatus('Please enter a domain', 'error');
    return;
  }
  
  if (!isValidDomain(domain)) {
    showStatus('Please enter a valid domain (e.g., reddit.com)', 'error');
    return;
  }
  
  if (blockedSites.includes(domain)) {
    showStatus('This site is already in your list', 'error');
    return;
  }
  
  blockedSites.push(domain);
  newSiteInput.value = '';
  renderSitesList();
  showStatus('', '');
}

function removeSite(index) {
  if (!isSiteEditDeleteAllowed()) {
    showStatus('Cannot delete sites outside edit window', 'error');
    return;
  }
  blockedSites.splice(index, 1);
  renderSitesList();
}

function openEditModal(index) {
  if (!isSiteEditDeleteAllowed()) {
    showStatus('Cannot edit sites outside edit window', 'error');
    return;
  }
  editingIndex = index;
  editSiteInput.value = blockedSites[index];
  editModal.classList.add('visible');
  editSiteInput.focus();
}

function closeEditModal() {
  editModal.classList.remove('visible');
  editingIndex = -1;
  editSiteInput.value = '';
}

function saveEdit() {
  const domain = normalizeDomain(editSiteInput.value);
  
  if (!domain) {
    return;
  }
  
  if (!isValidDomain(domain)) {
    return;
  }
  
  // Check for duplicates (excluding current item)
  const duplicate = blockedSites.findIndex((site, i) => site === domain && i !== editingIndex);
  if (duplicate !== -1) {
    return;
  }
  
  blockedSites[editingIndex] = domain;
  renderSitesList();
  closeEditModal();
}

function renderSitesList() {
  sitesList.innerHTML = '';
  
  if (blockedSites.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  const canEditDelete = isSiteEditDeleteAllowed();
  
  blockedSites.forEach((site, index) => {
    const item = document.createElement('div');
    item.className = 'site-item';
    
    const actionsDisabledClass = canEditDelete ? '' : 'disabled';
    
    item.innerHTML = `
      <span class="site-domain">${escapeHtml(site)}</span>
      <div class="site-actions">
        <button class="site-action-btn edit ${actionsDisabledClass}" title="${canEditDelete ? 'Edit' : 'Locked'}" data-index="${index}" ${canEditDelete ? '' : 'disabled'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 2.5L13.5 4.5M2 14L2.5 11.5L11 3L13 5L4.5 13.5L2 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="site-action-btn delete ${actionsDisabledClass}" title="${canEditDelete ? 'Delete' : 'Locked'}" data-index="${index}" ${canEditDelete ? '' : 'disabled'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
    
    if (canEditDelete) {
      item.querySelector('.edit').addEventListener('click', () => openEditModal(index));
      item.querySelector('.delete').addEventListener('click', () => removeSite(index));
    }
    
    sitesList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function saveSettings() {
  // Validate rehab mode restrictions before saving
  if (originalSettings.rehabMode.enabled && !isEditingAllowed()) {
    // Check if user is trying to make restricted changes
    if (delaySeconds < originalSettings.delaySeconds) {
      showStatus('Cannot decrease delay outside edit window', 'error');
      return;
    }
    
    if (rehabMode.enabled !== originalSettings.rehabMode.enabled ||
        rehabMode.startTime !== originalSettings.rehabMode.startTime ||
        rehabMode.endTime !== originalSettings.rehabMode.endTime) {
      showStatus('Cannot modify Rehab Mode settings outside edit window', 'error');
      return;
    }
    
    // Check for site deletions
    const deletedSites = originalSettings.blockedSites.filter(site => !blockedSites.includes(site));
    if (deletedSites.length > 0) {
      showStatus('Cannot delete sites outside edit window', 'error');
      return;
    }
  }
  
  // Update rehab mode state from inputs
  rehabMode.startTime = rehabStartTime.value;
  rehabMode.endTime = rehabEndTime.value;
  
  try {
    await chrome.storage.sync.set({
      blockedSites: blockedSites,
      delaySeconds: delaySeconds,
      rehabMode: rehabMode
    });
    
    originalSettings = {
      blockedSites: [...blockedSites],
      delaySeconds: delaySeconds,
      rehabMode: { ...rehabMode }
    };
    
    showStatus('Settings saved successfully', 'success');
    updateRehabStatus();
    updateRestrictionUI();
    
    // Clear status after 3 seconds
    setTimeout(() => showStatus('', ''), 3000);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

function cancelChanges() {
  blockedSites = [...originalSettings.blockedSites];
  delaySeconds = originalSettings.delaySeconds;
  rehabMode = { ...originalSettings.rehabMode };
  updateUI();
  updateRestrictionUI();
  showStatus('Changes cancelled', '');
  setTimeout(() => showStatus('', ''), 2000);
}

function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = 'save-status';
  if (type) {
    saveStatus.classList.add(type);
  }
}

// Update status periodically to reflect time changes
setInterval(() => {
  if (originalSettings.rehabMode.enabled) {
    updateRehabStatus();
    updateRestrictionUI();
  }
}, 60000); // Check every minute
