/**
 * LeadFlow AI Chat Widget
 * Embed: <script src="https://app.leadflowai.com/widget.js" data-org-id="YOUR_ORG_ID"></script>
 */
(function () {
  "use strict";

  const script = document.currentScript || document.querySelector('script[data-org-id]');
  const orgId = script?.getAttribute("data-org-id");
  if (!orgId) return console.warn("[LeadFlow] Missing data-org-id attribute");

  const API_BASE = script?.getAttribute("data-api-base") || "https://app.leadflowai.com";
  let config = { businessName: "Us", greeting: "Hi! How can we help you today?", primaryColor: "#2563eb", widgetPosition: "bottom-right" };
  let sessionData = { step: "greeting", answers: [], leadData: {} };
  let isOpen = false;

  const STEPS = [
    { id: "name", question: "What's your name?", field: "firstName" },
    { id: "phone", question: "What's the best phone number to reach you?", field: "phone" },
    { id: "service", question: "What service are you looking for?", field: "serviceType" },
    { id: "urgency", question: "How soon do you need this done?", field: "notes" },
    { id: "done", question: null, field: null },
  ];

  let currentStepIndex = 0;

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #lf-widget-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        width: 60px; height: 60px; border-radius: 50%;
        background: ${config.primaryColor}; border: none; cursor: pointer;
        box-shadow: 0 4px 20px rgba(37,99,235,0.4); transition: transform 0.2s, box-shadow 0.2s;
        display: flex; align-items: center; justify-content: center;
      }
      #lf-widget-btn:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(37,99,235,0.5); }
      #lf-widget-btn svg { width: 28px; height: 28px; fill: white; }
      #lf-widget-panel {
        position: fixed; bottom: 96px; right: 24px; z-index: 9999;
        width: 360px; max-height: 520px; background: white; border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden;
        transition: opacity 0.2s, transform 0.2s; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: none; flex-direction: column;
      }
      #lf-widget-panel.open { display: flex; }
      .lf-header { background: ${config.primaryColor}; padding: 20px; color: white; }
      .lf-header h3 { margin: 0 0 4px; font-size: 16px; font-weight: 700; }
      .lf-header p { margin: 0; font-size: 13px; opacity: 0.85; }
      .lf-body { flex: 1; padding: 16px; overflow-y: auto; }
      .lf-message { margin-bottom: 12px; }
      .lf-message.bot .lf-bubble { background: #f1f5f9; color: #1e293b; border-radius: 12px 12px 12px 4px; }
      .lf-message.user .lf-bubble { background: ${config.primaryColor}; color: white; border-radius: 12px 12px 4px 12px; margin-left: auto; }
      .lf-bubble { display: inline-block; padding: 10px 14px; font-size: 14px; line-height: 1.5; max-width: 85%; }
      .lf-input-area { padding: 12px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; }
      .lf-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; }
      .lf-input:focus { border-color: ${config.primaryColor}; box-shadow: 0 0 0 3px ${config.primaryColor}20; }
      .lf-send-btn { background: ${config.primaryColor}; color: white; border: none; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-size: 14px; font-weight: 600; }
      .lf-send-btn:hover { opacity: 0.9; }
      .lf-notification { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; background: #ef4444; border-radius: 50%; border: 2px solid white; }
    `;
    document.head.appendChild(style);
  }

  function createWidget() {
    const btn = document.createElement("button");
    btn.id = "lf-widget-btn";
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
      <span class="lf-notification"></span>`;
    btn.onclick = toggleWidget;

    const panel = document.createElement("div");
    panel.id = "lf-widget-panel";
    panel.innerHTML = `
      <div class="lf-header">
        <h3>${config.businessName}</h3>
        <p>${config.greeting}</p>
      </div>
      <div class="lf-body" id="lf-messages"></div>
      <div class="lf-input-area">
        <input class="lf-input" id="lf-input" placeholder="Type a message..." />
        <button class="lf-send-btn" id="lf-send">Send</button>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    document.getElementById("lf-send")?.addEventListener("click", handleSend);
    document.getElementById("lf-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend();
    });

    // Show initial bot message after 1.5s
    setTimeout(() => addBotMessage(config.greeting + " Type anything to get started!"), 1500);
  }

  function toggleWidget() {
    isOpen = !isOpen;
    const panel = document.getElementById("lf-widget-panel");
    const notif = document.querySelector(".lf-notification");
    if (panel) panel.classList.toggle("open", isOpen);
    if (notif && isOpen) (notif as HTMLElement).style.display = "none";

    if (isOpen && currentStepIndex === 0) {
      setTimeout(() => addBotMessage(STEPS[0].question!), 400);
      currentStepIndex = 1;
    }
  }

  function addBotMessage(text: string) {
    const messages = document.getElementById("lf-messages");
    if (!messages) return;
    const div = document.createElement("div");
    div.className = "lf-message bot";
    div.innerHTML = `<div class="lf-bubble">${text}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function addUserMessage(text: string) {
    const messages = document.getElementById("lf-messages");
    if (!messages) return;
    const div = document.createElement("div");
    div.className = "lf-message user";
    div.innerHTML = `<div class="lf-bubble">${text}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function handleSend() {
    const input = document.getElementById("lf-input") as HTMLInputElement;
    if (!input || !input.value.trim()) return;

    const value = input.value.trim();
    input.value = "";
    addUserMessage(value);

    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep?.field) {
      (sessionData.leadData as any)[prevStep.field] = value;
      if (prevStep.id !== "urgency") {
        sessionData.answers.push({ question: prevStep.question || "", answer: value });
      }
    }

    if (currentStepIndex < STEPS.length - 1) {
      setTimeout(() => {
        addBotMessage(STEPS[currentStepIndex].question!);
        currentStepIndex++;
      }, 500);
    } else {
      // Submit lead
      setTimeout(() => {
        addBotMessage("Thank you! We're processing your request...");
        submitLead();
      }, 500);
    }
  }

  async function submitLead() {
    try {
      const res = await fetch(`${API_BASE}/api/widget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          action: "submit",
          leadData: { ...sessionData.leadData, answers: sessionData.answers },
        }),
      });
      const data = await res.json();
      setTimeout(() => {
        addBotMessage(data.message || "We'll be in touch shortly. Thank you!");
        const inputArea = document.querySelector(".lf-input-area") as HTMLElement;
        if (inputArea) inputArea.style.display = "none";
      }, 500);
    } catch {
      addBotMessage("Thanks for reaching out! We'll contact you soon.");
    }
  }

  async function init() {
    try {
      const res = await fetch(`${API_BASE}/api/widget?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        config = { ...config, ...data };
      }
    } catch {}
    injectStyles();
    createWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
