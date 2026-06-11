let blockedSites = [];

// Load blocked sites on popup open
chrome.storage.sync.get(['blockedSites'], (result) => {
    blockedSites = result.blockedSites || [];
    renderList();
});

// Add site
document.getElementById('addBtn').addEventListener('click', addSite);
document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
});

function addSite() {
    const input = document.getElementById('urlInput');
    const url = input.value.trim().toLowerCase();

    if (!url) return;

    // Clean URL
    const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

    if (!blockedSites.includes(cleanUrl)) {
        blockedSites.push(cleanUrl);
        chrome.storage.sync.set({ blockedSites }, () => {
            renderList();
            input.value = '';
        });
    }
}

function removeSite(url) {
    blockedSites = blockedSites.filter(site => site !== url);
    chrome.storage.sync.set({ blockedSites }, renderList);
}

function renderList() {
    const list = document.getElementById('blockedList');
    const count = document.getElementById('count');

    count.textContent = blockedSites.length;

    if (blockedSites.length === 0) {
        list.innerHTML = '<div class="empty">No sites blocked yet</div>';
        return;
    }

    list.innerHTML = blockedSites.map(site => `
    <div class="site-item">
      <span>${site}</span>
      <button class="remove-btn" data-url="${site}">×</button>
    </div>
  `).join('');

    // Add remove listeners
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeSite(btn.dataset.url));
    });
}