chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "scrape") {
    const host = window.location.hostname;
    const messages = [];

    const getTopMessages = (els) => {
      const valid = els.filter(el => {
        if (el.querySelector('textarea, input') || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable || el.querySelector('[contenteditable="true"]')) return false;
        if (!el.innerText.trim()) return false;
        return true;
      });
      return valid.filter(el => {
        return !valid.some(other => other !== el && other.contains(el));
      });
    };

    if (host.includes("openai.com") || host.includes("chatgpt.com")) {
      const els = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"], .markdown'));
      getTopMessages(els).forEach(el => {
        const role = (el.getAttribute('data-message-author-role') === 'assistant' || el.classList.contains('markdown') || el.querySelector('.markdown')) ? 'assistant' : 'user';
        messages.push({ role, content: el.innerText.trim() });
      });
    } else if (host.includes("gemini.google.com")) {
      const els = Array.from(document.querySelectorAll('.user-query-text, .user-query, [data-test-id="user-query"], .model-response-text, message-content, .model-response'));
      getTopMessages(els).forEach(el => {
        const role = (el.classList.contains('user-query-text') || el.classList.contains('user-query') || el.hasAttribute('data-test-id') || el.closest('.user-query')) ? 'user' : 'assistant';
        messages.push({ role, content: el.innerText.trim() });
      });
    } else if (host.includes("claude.ai")) {
      const els = Array.from(document.querySelectorAll('[data-testid="user-message"], .font-user-message, .font-claude-response, .font-claude-message'));
      getTopMessages(els).forEach(el => {
        const role = (el.getAttribute('data-testid') === 'user-message' || el.classList.contains('font-user-message')) ? 'user' : 'assistant';
        messages.push({ role, content: el.innerText.trim() });
      });
    } else if (host.includes("copilot.microsoft.com") || host.includes("copilot.com")) {
      const els = Array.from(document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"], .group\\/user-message, .group\\/ai-message'));
      getTopMessages(els).forEach(el => {
        const role = (el.getAttribute('data-content') === 'user-message' || el.classList.contains('group/user-message') || el.closest('.group/user-message')) ? 'user' : 'assistant';
        messages.push({ role, content: el.innerText.trim() });
      });
    } else if (host.includes("grok.com") || host.includes("x.ai")) {
      const els = Array.from(document.querySelectorAll('div[id^="response-"], .response-content-markdown, [data-testid="message-row"], [data-testid="message-content"]'));
      getTopMessages(els).forEach(el => {
        const role = (el.closest('.response-content-markdown') || el.classList.contains('response-content-markdown')) ? 'assistant' : 'user';
        messages.push({ role, content: el.innerText.trim() });
      });
    } else if (host.includes("deepseek.com")) {
      const els = Array.from(document.querySelectorAll('.ds-chat-message, .ds-markdown, .ds-chat-message--user, .ds-chat-message--assistant'));
      getTopMessages(els).forEach(el => {
        const role = (el.querySelector('.ds-markdown') || el.classList.contains('ds-markdown') || el.closest('.ds-chat-message--assistant')) ? 'assistant' : 'user';
        messages.push({ role, content: el.innerText.trim() });
      });
    } else if (host.includes("perplexity.ai")) {
      const els = Array.from(document.querySelectorAll('.prose, [data-testid="message-container"]'));
      getTopMessages(els).forEach(el => {
        const role = (el.closest('.prose') || el.classList.contains('prose')) ? 'assistant' : 'user';
        messages.push({ role, content: el.innerText.trim() });
      });
    }
    sendResponse({ messages });
  }
  return true;
});
