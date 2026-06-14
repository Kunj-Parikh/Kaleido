chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || "";
  let current = "";
  if (url.includes("openai.com") || url.includes("chatgpt.com")) current = "chatgpt";
  else if (url.includes("gemini.google.com")) current = "gemini";
  else if (url.includes("claude.ai")) current = "claude";
  else if (url.includes("grok.com") || url.includes("x.ai")) current = "grok";
  else if (url.includes("deepseek.com")) current = "deepseek";
  else if (url.includes("perplexity.ai")) current = "perplexity";
  else if (url.includes("copilot.microsoft.com")) current = "copilot";
  
  const select = document.getElementById("llm-select");
  const options = ["chatgpt", "gemini", "claude", "grok", "deepseek", "perplexity", "copilot"];
  select.value = options.find(o => o !== current) || "chatgpt";

  document.getElementById("switch-btn").addEventListener("click", () => {
    const target = select.value;
    const nextQuestion = document.getElementById("next-question").value;
    
    chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["content_scripts/scraper.js"]
        }, () => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (res2) => {
            chrome.runtime.lastError;
            chrome.runtime.sendMessage({
              action: "switch",
              messages: res2?.messages || [],
              nextQuestion,
              target
            });
            window.close();
          });
        });
      } else {
        chrome.runtime.sendMessage({
          action: "switch",
          messages: res.messages || [],
          nextQuestion,
          target
        });
        window.close();
      }
    });
  });
});
