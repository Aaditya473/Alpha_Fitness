// Open chat helper
function openChat(pref){
  if (window.chatWidget && typeof window.chatWidget.open === 'function') {
    window.chatWidget.open(pref);
  } else {
    alert("Chat widget not loaded yet.");
  }
}

// Modals
function openModal(id){
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function closeModal(id){
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// Auth UI + forms
(async function initAuth(){
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const userMenuWrap = document.getElementById('user-menu');
  const userDropdown = document.getElementById('user-dropdown');
  const avatarBtn = document.getElementById('user-avatar');
  const logoutBtn = document.getElementById('logout-btn');

  let me = null;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) me = await res.json();
  } catch(e){}

  const loggedIn = !!(me && me.id);

  if (loggedIn){
    loginLink?.classList.add('hidden');
    registerLink?.classList.add('hidden');
    userMenuWrap?.classList.remove('hidden');
  } else {
    loginLink?.classList.remove('hidden');
    registerLink?.classList.remove('hidden');
    userMenuWrap?.classList.add('hidden');
  }

  let open = false;
  avatarBtn?.addEventListener('click', () => {
    open = !open;
    userDropdown?.classList.toggle('hidden', !open);
    avatarBtn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (e)=>{
    if (userMenuWrap && !userMenuWrap.contains(e.target)){
      open = false;
      userDropdown?.classList.add('hidden');
      avatarBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  logoutBtn?.addEventListener('click', async ()=>{
    await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
    location.reload();
  });

  // Login form
  document.getElementById('loginForm')?.addEventListener('submit', async function(e){
    e.preventDefault();
    const data = Object.fromEntries(new FormData(this).entries());
    const res = await fetch('/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify(data)
    });
    const json = await res.json();
    const msgEl = document.getElementById('loginMsg');
    if (!res.ok){
      msgEl.textContent = json.error || 'Login failed';
      msgEl.className = 'result-box error';
    } else {
      msgEl.textContent = 'Login successful!';
      msgEl.className = 'result-box success';
      setTimeout(()=> location.reload(), 700);
    }
  });

  // Register form
  document.getElementById('registerForm')?.addEventListener('submit', async function(e){
    e.preventDefault();
    const data = Object.fromEntries(new FormData(this).entries());
    const res = await fetch('/api/auth/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
    const json = await res.json();
    const msgEl = document.getElementById('regMsg');
    if (!res.ok){
      msgEl.textContent = json.error || 'Registration failed';
      msgEl.className = 'result-box error';
    } else {
      msgEl.textContent = 'Registered! You can login now.';
      msgEl.className = 'result-box success';
      setTimeout(()=>{
        closeModal('registerModal');
        openModal('loginModal');
      }, 800);
    }
  });

  // Contact form
  document.getElementById('contactForm')?.addEventListener('submit', async function(e){
    e.preventDefault();
    const res = await fetch('/contact', {
      method:'POST',
      body:new FormData(this)
    });
    const json = await res.json();
    const box = document.getElementById('contactResult');
    box.textContent = json.message || 'Sent!';
    this.reset();
  });

})();

// Services loading + booking
async function loadServices(){
  const wrap = document.getElementById('services');
  if (!wrap) return;
  const res = await fetch('/api/services', { credentials:'include' });
  const services = await res.json();
  wrap.innerHTML = (services || []).map(s => `
    <article class="service-card">
      <h3>${s.name}</h3>
      <p>${s.description || ''}</p>
      <div class="price">₹${s.price_inr}</div>
      <button onclick="bookService(${s.id})">Book</button>
    </article>
  `).join('');
}

window.bookService = async function(service_id){
  try {
    const res = await fetch('/api/book', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({ service_id })
    });
    if (res.status === 401){
      alert('Please login to book.');
      openModal('loginModal');
      return;
    }
    const data = await res.json();
    if (!window.Razorpay){
      alert('Payment SDK not loaded.');
      return;
    }
    const opts = {
      key: data.key_id,
      amount: data.amount_paise,
      currency: data.currency,
      name: "Alpha Fitness",
      description: "Service Booking",
      order_id: data.order_id,
      handler: function(){
        alert('Payment successful / processing. Check My Bookings.');
        location.href = '/booking';
      },
      theme:{ color:"#ffcc00" }
    };
    const rzp = new window.Razorpay(opts);
    rzp.open();
  } catch(e){
    console.error(e);
    alert('Could not start payment. Try again.');
  }
};

// My bookings loader
async function loadBookings(){
  const box = document.getElementById('booking-list');
  if (!box) return;
  const res = await fetch('/api/bookings/mine', { credentials:'include' });
  if (res.status === 401){
    box.innerHTML = '<p>Please login to see your bookings.</p>';
    return;
  }
  const bookings = await res.json();
  if (!bookings.length){
    box.innerHTML = '<p>No bookings yet.</p>';
    return;
  }
  box.innerHTML = bookings.map(b => `
    <article class="service-card">
      <h3>${b.service}</h3>
      <p>Quantity: ${b.quantity}</p>
      <p>Amount: ₹${b.amount_rupees}</p>
      <p>Status: <strong>${b.status}</strong></p>
      <small>${new Date(b.created_at).toLocaleString()}</small>
    </article>
  `).join('');
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadServices();
  loadBookings();
});
