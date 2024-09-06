const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in popup:", message, sender);
});

const chats = {}
const tabs = []
const state = {
  inactive: true,
  checking: false
}

setInterval(async () => {
  if (state.inactive || state.checking) return;
  state.checking = true;
  for (const tab of tabs) {
    chrome.tabs.update(tab, { active: true });
    await delay(1000)
    chrome.tabs.update(tab, { active: false });
  }
  state.checking = false;
}, 500)
document.addEventListener('DOMContentLoaded', async () => {

  // Get the form and input field elements
  const form = document.getElementById('extension-form');

  // Add an event listener to the form's submit event
  form.addEventListener('submit', async (event) => {
    // Prevent the default form submission behavior
    Object.keys(chats).forEach(key => delete myDict[key]);

    event.preventDefault();
    const inputField = document.getElementById('question-input');

    chrome.storage.session.set({ question: inputField.value })

    // Open a new tab with the website
    const newTab = await chrome.tabs.create({ url: 'https://chatgpt.com' });
    tabs.push(newTab.id);

    // Wait for the tab to be fully loaded
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === newTab.id && info.status === 'complete') {
        // Remove the listener to prevent it from triggering multiple times
        chrome.tabs.onUpdated.removeListener(listener);
        const claude = chrome.tabs.create({ url: 'https://claude.ai' });
        tabs.push(claude.id);
        const gemini = chrome.tabs.create({ url: 'https://gemini.google.com/app' });
        tabs.push(gemini.id);
        state.inactive = false;
        // Send a message to the content script in the new tab
        chrome.tabs.sendMessage(tabId, { action: 'readFocusedElement' });
      }
    });
  });
});


const renderChats = () => {
  const chatList = document.getElementById('chat-list');
  chatList.innerHTML = '';
  if (!chats) return;
  Object.entries(chats).forEach(([key, newValue]) => {
    const chatItem = document.createElement('li');
    chatItem.innerHTML = `
    <dl class="divide-y divide-gray-100">
    <div class="px-4 sm:px-0">
      <h3 class="text-base font-semibold leading-7 text-gray-900">${key}</h3>
      <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500">${newValue}</p>
    </div>
  </dl>
    `;

    chatList.appendChild(chatItem);
  })
};


chrome.storage.session.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    if (key.includes('.')) {
      chats[key] = newValue
      setTimeout(() => {
        state.inactive = true;
      }, 2000)
    }
    renderChats();
    console.log(
      `PU Storage key "${key}" in namespace "${namespace}" changed.`,
      `PU Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});