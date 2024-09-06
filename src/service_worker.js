const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


let state = {
  inactive: true,
  checking: false,
  intervalFunction: null,
  tabs: []
};
const tabSwitching = async () => {
    console.log("Tab switching", state);
    if (state.inactive || state.checking) return;
    state.checking = true;
    for (const tabId of Object.values(state.tabs)) {
      try {
        console.log("Switching to tab", tabId);
        await chrome.tabs.update(tabId, { active: true });
        await delay(250);
      } catch (error) {
        console.error('Error switching tabs:', error);
      }
    }
    state.checking = false;
  }
  
  function startTabSwitching() {
    console.log("Start Tab switching", state);
    if (!state.inactive || state.checking) return;
    state.inactive = false;
    state.intervalFunction = setInterval(tabSwitching, 200);
  }
  
  function stopTabSwitching() {
    state.inactive = true;
    if (state.intervalFunction) {
      clearInterval(state.intervalFunction);
      state.intervalFunction = null;
    }
    state.checking = false;
  }


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received content in service worker:", message, sender);
    const { action } = message;
    switch (action) {
        case 'loaded':
            chrome.storage.session.get(["question"], ({ question }) => {
                if(!question) return;
                console.log("question", question)
                chrome.tabs.sendMessage(sender.tab.id, { action: 'question', payload: question });
            })
            break;
        case 'response':
            const { host } = new URL(sender.url);
            chrome.storage.session.set({ [host]: message.payload });
            // remove question
            chrome.storage.session.remove("question");
            break
        case 'complete':
            chrome.tabs.remove(sender.tab.id);
            const key = new URL(sender.url).host;
            // delete key from state.tabs
            delete state.tabs[key];
            break;
        case 'startTabSwitching':
                startTabSwitching();
                state.tabs = message.tabs;
            break;
        case 'stopTabSwitching':
            stopTabSwitching();
            break;
        default:
            sendResponse({ status: 'received' });
    }

});




chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(
        `SW Storage key "${key}" in namespace "${namespace}" changed.`,
        `SW Old value was "${oldValue}", new value is "${newValue}".`
      );
    }
  });


  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (!tab.url) return;

    // Enables the side panel on chatgpt.com
    // Disables the side panel on all other sites
    await chrome?.sidePanel?.setOptions({
        tabId,
        enabled: true
    });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
