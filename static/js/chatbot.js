/* Simple site-wide chatbot widget.
   - Injects UI into #chat-root
   - Minimal logic for demo: recognizes keywords and suggests links
*/
(function(){
  const root = document.getElementById('chat-root');
  if (!root) return;

  // create widget container
  const widget = document.createElement('div');
  widget.id = 'chat-widget';
  widget.innerHTML = `
    <div id="chat-header">
      <span>Chat with Alpha</span>
      <button id="chat-close" aria-label="close">✕</button>
    </div>
    <div id="chat-body" style="display:none;">
      <div id="chat-messages" aria-live="polite"></div>
      <div id="chat-input-row">
        <input id="chat-input" placeholder="Hi — ask about plans, trainers or BMI..." />
        <button id="chat-send">Send</button>
      </div>
    </div>
  `;
  // base styles (small, to ensure appearance even if CSS missing)
  const s = document.createElement('style');
  s.textContent = `
    #chat-widget{position:fixed;right:18px;bottom:18px;width:320px;max-width:92vw;background:#111;border:2px solid var(--accent);border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.6);z-index:9999;font-family:Arial;color:#fff}
    #chat-header{background:var(--accent);color:#000;padding:10px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;font-weight:800;cursor:pointer}
    #chat-header button{background:transparent;border:none;font-weight:700;cursor:pointer}
    #chat-body{padding:12px;display:flex;flex-direction:column;gap:8px}
    #chat-messages{max-height:220px;overflow:auto;padding-right:6px}
    .msg-user{color:var(--accent);margin:8px 0;font-weight:700}
    .msg-bot{color:#ddd;margin:6px 0}
    #chat-input-row{display:flex;gap:8px}
    #chat-input{flex:1;padding:8px;border-radius:6px;border:1px solid rgba(255,204,0,0.12);background:transparent;color:#fff}
    #chat-send{background:var(--accent);color:#000;border:none;padding:8px 10px;border-radius:6px;cursor:pointer;font-weight:800}
    @media (max-width:480px){#chat-widget{right:10px;left:10px;width:auto}}
  `;
  document.head.appendChild(s);
  root.appendChild(widget);

  const header = widget.querySelector('#chat-header');
  const body = widget.querySelector('#chat-body');
  const messages = widget.querySelector('#chat-messages');
  const input = widget.querySelector('#chat-input');
  const send = widget.querySelector('#chat-send');
  const closeBtn = widget.querySelector('#chat-close');

  let openState = false;
  function toggle(openPref){
    openState = !openState;
    body.style.display = openState ? 'block' : 'none';
    if (openState) {
      input.focus();
      if (openPref) setTimeout(()=>sendPref(openPref),250);
    }
  }
  header.addEventListener('click', ()=> toggle());

  closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); toggle(); });

  // simple send handler
  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function(e){ if (e.key === 'Enter') sendMessage(); });

  function appendUser(text){
    const d = document.createElement('div'); d.className='msg-user'; d.textContent = 'You: ' + text; messages.appendChild(d); messages.scrollTop = messages.scrollHeight;
  }
  function appendBot(html){
    const d = document.createElement('div'); d.className='msg-bot'; d.innerHTML = html; messages.appendChild(d); messages.scrollTop = messages.scrollHeight;
  }

  function sendMessage(){
    const txt = input.value.trim();
    if (!txt) return;
    appendUser(txt);
    input.value = '';
    botReply(txt);
  }

  function sendPref(pref){
    // prefill or auto trigger a bot reply with the pref
    appendUser(pref);
    botReply(pref);
  }

  function botReply(msg){
    const m = msg.toLowerCase();
    // quick rules
    if (m.includes('bmi')) {
      appendBot('Bot: Use our <a href="bmi.html">BMI Calculator</a> to check your BMI. Want a recommendation?');
    } else if (m.includes('calor') || m.includes('burn') || m.includes('calorie')) {
      appendBot('Bot: Use <a href="calorie.html">Calorie Counter</a>. Tell me activity & minutes and I\'ll estimate.');
    } else if (m.includes('price') || m.includes('plan') || m.includes('cost')) {
      appendBot('Bot: Plans start from ₹2999/month. Would you like to <a href="contact.html">book a trial</a>?');
    } else if (m.includes('fat') || m.includes('fat loss')) {
      appendBot('Bot: For fat loss we recommend HIIT + calorie deficit. See <a href="services.html">Fat Loss</a>. Want to book?');
    } else if (m.includes('muscle')) {
      appendBot('Bot: Muscle plan includes progressive overload and high protein. See <a href="services.html">Muscle Gain</a>.');
    } else if (m.includes('yoga')) {
      appendBot('Bot: Yoga classes are available weekly. See <a href="services.html">Yoga</a>.');
    } else if (m.includes('trainer') || m.includes('book') || m.includes('session')) {
      appendBot('Bot: You can book a trainer from the <a href="trainer.html">Trainers</a> page. Which trainer or time do you prefer?');
    } else if (m.includes('hello') || m.includes('hi') || m.includes('hey')) {
      appendBot('Bot: Hi! I can help with plans, prices, trainers, BMI & calories. Try: "price", "bmi", "trainer".');
    } else {
      appendBot('Bot: Sorry, I did not understand. I can help with <strong>plans</strong>, <strong>bmi</strong>, <strong>calories</strong> or <strong>trainers</strong>.');
    }
  }

  // Expose a tiny API to open widget programmatically
  window.chatWidget = {
    open: function(pref){
      if (!openState) toggle();
      if (pref) setTimeout(()=>sendPref(pref),300);
    },
    close: function(){ if (openState) toggle(); }
  };
})();
