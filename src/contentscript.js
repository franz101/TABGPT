const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function waitForElement(selector) {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);

    if (element) {
      // If element already exists, resolve the promise immediately
      resolve(element);
      return;
    }

    // Create a MutationObserver to monitor the DOM for changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const nodes = Array.from(mutation.addedNodes);
        for (const node of nodes) {
          if (node.nodeType === 1) { // Check if node is an element
            const targetElement = node.matches(selector) ? node : node.querySelector(selector);
            if (targetElement) {
              // When the element is found, resolve the promise and disconnect the observer
              resolve(targetElement);
              observer.disconnect();
              return;
            }
          }
        }
      });
    });

    // Start observing the document body for child list and subtree changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

waitForElement('button').then((element) => {
  chrome.runtime.sendMessage({ action: "loaded", title: document.title })
});

const askQuestionGemini = async (question) => {
  await delay(1000)
  await waitForElement('[aria-label="Enter a prompt here"] > p')
  const inputElement = document.querySelector('[aria-label="Enter a prompt here"] > p');
  inputElement.innerText = question
  await waitForElement('[aria-label="Send message"]')
  const send = document.querySelector('[aria-label="Send message"]')
  send.click()
  chrome.runtime.sendMessage({ action: 'response', payload: "Loading..." });
  //button colo="primary" tabindex="0"
  await waitForElement('message-content')
  await delay(2000)

  await waitForElement('button[tabindex="-1"]')
  const messages = document.querySelectorAll("message-content")
  const lastMessage = messages[messages.length - 1].textContent
  chrome.runtime.sendMessage({ action: 'response', payload: lastMessage });


}



const askQuestionChatGPT = async (question) => {
  await waitForElement('#prompt-textarea')
  const inputElement = document.querySelector('#prompt-textarea');
  inputElement.value = question
  await delay(1000)

  // Trigger input event
  await waitForElement('[aria-label="Send prompt"]')
  document.querySelector('[aria-label="Send prompt"]').click()
  chrome.runtime.sendMessage({ action: 'response', payload: "Loading..." });
  await waitForElement('[aria-label="Stop streaming"]')
  await waitForElement('[data-message-author-role="assistant"]:last-of-type')
  await waitForElement('[aria-label="Send prompt"]')

  const latestArticle = document.querySelector('[data-message-author-role="assistant"]:last-of-type')
  if (latestArticle) chrome.runtime.sendMessage({ action: 'response', payload: latestArticle.textContent });

}

const askQuestionAnthropic = async (question) => {
  await waitForElement('[contenteditable="true"] > p')
  const input = document.querySelector('[contenteditable="true"] > p');
  input.innerText = question
  await delay(1000)

  try {
    await document.querySelector('[aria-label="Send Message"]').click()
    chrome.runtime.sendMessage({ action: 'response', payload: "Loading..." });
  } catch (error) {
    chrome.runtime.sendMessage({ action: 'response', payload: "Error" });
  }
  await waitForElement('[data-is-streaming="true"]')
  await waitForElement('[data-is-streaming="false"]')
  const latestArticle = document.querySelector('[data-is-streaming="false"]:last-of-type').textContent
  chrome.runtime.sendMessage({ action: 'response', payload: latestArticle.textContent });
}


const askQuestion = (question) => {
  const url = window.location.href;
  if (url.includes('chatgpt')) {
    askQuestionChatGPT(question)
  } else if (url.includes('claude')) {
    askQuestionAnthropic(question)
  }
  else if (url.includes('gemini')) {
    askQuestionGemini(question)
  }
  else {
    console.log('Unsupported website');
  }
}



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action } = message;
  switch (action) {
    case 'question':
      // Read the currently focused element
      askQuestion(message.payload);
      break;
    default:
      sendResponse({ status: 'received' });
  }
})