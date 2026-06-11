// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return; // Only main frame

    chrome.storage.sync.get(['blockedSites'], (result) => {
        const blockedSites = result.blockedSites || [];
        const url = new URL(details.url);
        const hostname = url.hostname.replace(/^www\./, '');

        // Check if site is blocked
        const isBlocked = blockedSites.some(site => {
            return hostname === site || hostname.endsWith('.' + site);
        });

        if (isBlocked) {
            chrome.tabs.update(details.tabId, {
                url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(hostname)
            });
        }
    });
});