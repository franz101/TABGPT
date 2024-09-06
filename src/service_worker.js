chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});



const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let state = {
  inactive: true,
  checking: false,
  intervalFunction: null,
  tabs: []
};
const tabSwitching = async () => {
    if (state.inactive || state.checking) return;
    state.checking = true;
    for (const tabId of Object.values(state.tabs)) {
      try {
        await chrome.tabs.update(tabId, { active: true });
        await delay(250);
      } catch (error) {
        console.error('Error switching tabs:', error);
      }
    }
    state.checking = false;
  }
  
  function startTabSwitching() {
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
    const { action } = message;
    switch (action) {
        case 'loaded':
            chrome.storage.session.get(["question"], ({ question }) => {
                if(!question) return;
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


