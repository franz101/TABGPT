
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const chats = {}
const tabs = {}

document.addEventListener('DOMContentLoaded', async () => {
  // Get the form and input field elements
  const form = document.getElementById('extension-form');

  // Add an event listener to the form's submit event
  form.addEventListener('submit', async (event) => {
    // Prevent the default form submission behavior
    Object.keys(chats).forEach(key => delete chats[key]);

    event.preventDefault();
    const inputField = document.getElementById('question-input');

    chrome.storage.session.set({ question: inputField.value })


    // Create tabs
    const claudeUrl = 'https://claude.ai';
    const claude = await chrome.tabs.create({ url: claudeUrl });
    tabs[new URL(claudeUrl).host] = claude.id;

    const geminiUrl = 'https://gemini.google.com/app';
    const gemini = await chrome.tabs.create({ url: geminiUrl });
    tabs[new URL(geminiUrl).host] = gemini.id;
    const chatgptUrl = 'https://chatgpt.com';
    const chatgpt = await chrome.tabs.create({ url:chatgptUrl });
    tabs[new URL(chatgptUrl).host] = chatgpt.id;

    chrome.runtime.sendMessage({ action: 'startTabSwitching', tabs });

  });
});


const renderChats = () => {
  const chatList = document.getElementById('chat-list');
  chatList.innerHTML = '';
  if (!chats) return;
  chrome.runtime.sendMessage({ action: 'stopTabSwitching', tabs: tabs });
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
    }
    renderChats();
  }
});
