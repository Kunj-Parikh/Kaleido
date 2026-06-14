importScripts("../nlp/pipeline.js");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "switch") {
    const urls = {
      chatgpt: "https://chatgpt.com/",
      gemini: "https://gemini.google.com/",
      claude: "https://claude.ai/",
      grok: "https://grok.com/",
      deepseek: "https://chat.deepseek.com/",
      perplexity: "https://www.perplexity.ai/",
      copilot: "https://copilot.microsoft.com/"
    };
    const targetUrl = urls[msg.target];
    const prompt = runPipeline(msg.messages, msg.nextQuestion);

    chrome.tabs.create({ url: targetUrl }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (p) => { window.kaleidoPrompt = p; },
            args: [prompt]
          }, () => {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content_scripts/injector.js"]
            });
          });
        }
      });
    });
  }
});
