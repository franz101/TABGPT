

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received content in service worker:", message, sender);
    const { action } = message;
    switch (action) {
        case 'loaded':
            chrome.storage.session.get(["question"], ({ question }) => {
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
            break;
        default:
            sendResponse({ status: 'received' });
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


chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(
        `SW Storage key "${key}" in namespace "${namespace}" changed.`,
        `SW Old value was "${oldValue}", new value is "${newValue}".`
      );
    }
  });