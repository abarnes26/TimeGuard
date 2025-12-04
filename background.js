// TimeGuard - Background Service Worker

// State management
// Tracks which tabs have "passed" for which domains after completing countdown
const tabPasses = new Map(); // tabId -> Set of domains

// Track previous domains for each tab to detect cross-domain navigation
const tabPreviousDomains = new Map(); // tabId -> domain

// Utility: Normalize domain
function normalizeDomain(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

// Utility: Check if a domain matches any blocked domain
function isBlockedDomain(domain, blockedSites) {
  const normalizedDomain = normalizeDomain(domain);
  return blockedSites.some(blocked => normalizeDomain(blocked) === normalizedDomain);
}

// Utility: Get the extension's own URL prefix
function getExtensionUrlPrefix() {
  return chrome.runtime.getURL('');
}

// Handle navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigation
  if (details.frameId !== 0) return;
  
  const { tabId, url } = details;
  
  // Skip extension pages
  if (url.startsWith(getExtensionUrlPrefix())) return;
  
  // Skip non-http(s) URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  
  try {
    const targetUrl = new URL(url);
    const targetDomain = normalizeDomain(targetUrl.hostname);
    
    // Load blocked sites
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];
    
    // Check if this domain is blocked
    if (!isBlockedDomain(targetDomain, blockedSites)) {
      // Not blocked, update previous domain and allow
      tabPreviousDomains.set(tabId, targetDomain);
      return;
    }
    
    // Domain is blocked - check if tab has a pass for this domain
    const passes = tabPasses.get(tabId);
    if (passes && passes.has(targetDomain)) {
      // Tab has a pass, allow through and update previous domain
      tabPreviousDomains.set(tabId, targetDomain);
      return;
    }
    
    // Check if coming from the same domain (internal navigation)
    const previousDomain = tabPreviousDomains.get(tabId);
    if (previousDomain === targetDomain) {
      // Same domain navigation, allow through
      return;
    }
    
    // Need to show countdown - redirect to countdown page
    const countdownUrl = chrome.runtime.getURL('countdown.html') + 
      '?target=' + encodeURIComponent(url);
    
    chrome.tabs.update(tabId, { url: countdownUrl });
    
  } catch (error) {
    console.error('Error in navigation handler:', error);
  }
});

// Handle completed navigation to update previous domain tracking
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  
  const { tabId, url } = details;
  
  // Skip extension pages and non-http(s)
  if (url.startsWith(getExtensionUrlPrefix())) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  
  try {
    const targetUrl = new URL(url);
    const targetDomain = normalizeDomain(targetUrl.hostname);
    tabPreviousDomains.set(tabId, targetDomain);
  } catch (error) {
    // Ignore invalid URLs
  }
});

// Handle tab removal - clean up state
chrome.tabs.onRemoved.addListener((tabId) => {
  tabPasses.delete(tabId);
  tabPreviousDomains.delete(tabId);
});

// Listen for messages from countdown page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COUNTDOWN_COMPLETE') {
    const { tabId, domain } = message;
    
    // Grant pass for this domain on this tab
    if (!tabPasses.has(tabId)) {
      tabPasses.set(tabId, new Set());
    }
    tabPasses.get(tabId).add(domain);
    
    // Also set as previous domain so internal navigation works
    tabPreviousDomains.set(tabId, domain);
    
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Clean up passes when navigating away from a blocked domain
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  const { tabId, url } = details;
  
  // Skip extension pages
  if (url.startsWith(getExtensionUrlPrefix())) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  
  try {
    const targetUrl = new URL(url);
    const currentDomain = normalizeDomain(targetUrl.hostname);
    
    // Get all passes for this tab
    const passes = tabPasses.get(tabId);
    if (!passes || passes.size === 0) return;
    
    // Load blocked sites to check which domains to keep passes for
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];
    
    // If navigating away from a blocked domain, revoke the pass for that domain
    const previousDomain = tabPreviousDomains.get(tabId);
    if (previousDomain && previousDomain !== currentDomain) {
      // User navigated to a different domain
      // Check if the previous domain was blocked
      if (isBlockedDomain(previousDomain, blockedSites)) {
        // Revoke the pass for the previous blocked domain
        passes.delete(previousDomain);
      }
    }
  } catch (error) {
    console.error('Error in committed handler:', error);
  }
});

// Handle new window/tab creation - ensure no inherited passes
chrome.tabs.onCreated.addListener((tab) => {
  // New tabs start with no passes
  tabPasses.delete(tab.id);
  tabPreviousDomains.delete(tab.id);
});

