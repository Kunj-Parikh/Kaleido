(function() {
  const prompt = window.kaleidoPrompt;
  if (!prompt) return;
  const host = window.location.hostname;

  const tryInject = (selector, isEditable) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const input = document.querySelector(selector);
      if (input) {
        clearInterval(interval);
        if (isEditable || input.isContentEditable) {
          input.focus();
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, prompt);
          if (!input.textContent.includes(prompt.slice(0, 20))) {
            input.textContent = prompt;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } else {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
            || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (nativeInputValueSetter) nativeInputValueSetter.call(input, prompt);
          else input.value = prompt;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        input.focus();
      } else if (Date.now() - start > 10000) {
        clearInterval(interval);
      }
    }, 200);
  };

  if (host.includes("openai.com") || host.includes("chatgpt.com")) {
    tryInject("#prompt-textarea", false);
  } else if (host.includes("gemini.google.com")) {
    tryInject(".ql-editor", true);
  } else if (host.includes("claude.ai")) {
    tryInject('[contenteditable="true"].ProseMirror', true);
  } else if (host.includes("grok.com") || host.includes("x.ai")) {
    tryInject('textarea[aria-label], main textarea, [role="textbox"]', false);
  } else if (host.includes("deepseek.com")) {
    tryInject('textarea#chat-input, textarea[placeholder], [contenteditable="true"]', false);
  } else if (host.includes("perplexity.ai")) {
    tryInject('#ask-input, [data-lexical-editor="true"]', true);
  } else if (host.includes("copilot.microsoft.com")) {
    tryInject("#userInput", false);
  }
})();
