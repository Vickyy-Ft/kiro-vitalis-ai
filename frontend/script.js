/* ===== VITALIS AI — MAIN SCRIPT ===== */

// ===== LOADING SCREEN =====
(function () {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;
  const bar = document.getElementById('loading-bar');
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 18 + 4;
    if (progress >= 100) { progress = 100; clearInterval(interval); }
    bar.style.width = progress + '%';
    if (progress === 100) {
      setTimeout(() => screen.classList.add('hidden'), 300);
    }
  }, 80);
})();

// ===== AOS INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
  }

  initNavbar();
  initParticles();
  initHeartbeat();
  initCounters();
  initChatDemo();
  initHamburger();
});

// ===== NAVBAR =====
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// ===== HAMBURGER =====
function initHamburger() {
  const ham = document.getElementById('hamburger');
  if (!ham) return;
  ham.addEventListener('click', () => {
    const links = document.querySelector('.nav-links');
    const cta = document.querySelector('.nav-cta');
    if (links) {
      const open = links.style.display === 'flex';
      links.style.cssText = open ? '' : 'display:flex;flex-direction:column;position:fixed;top:70px;left:0;right:0;background:rgba(5,5,5,0.97);padding:24px;gap:20px;border-bottom:1px solid rgba(255,255,255,0.08);z-index:999;backdrop-filter:blur(20px);';
      if (cta) cta.style.cssText = open ? '' : 'display:flex;flex-direction:column;padding:0 24px 24px;position:fixed;top:calc(70px + ' + (links.querySelectorAll('li').length * 44) + 'px);left:0;right:0;background:rgba(5,5,5,0.97);z-index:999;gap:10px;';
    }
  });
}

// ===== PARTICLES =====
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = window.innerWidth < 768 ? 40 : 80;
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.05
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      ctx.fill();
    });
    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${0.04 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ===== HEARTBEAT LINE =====
function initHeartbeat() {
  const poly = document.getElementById('heartbeat-poly');
  if (!poly) return;
  let offset = 0;
  function generateHeartbeat(width, height, offset) {
    const pts = [];
    const step = 4;
    for (let x = 0; x <= width; x += step) {
      const pos = (x + offset) % 200;
      let y = height / 2;
      if (pos > 60 && pos < 80) {
        const t = (pos - 60) / 20;
        y = height / 2 - Math.sin(t * Math.PI) * (height * 0.6);
      } else if (pos > 80 && pos < 90) {
        const t = (pos - 80) / 10;
        y = height / 2 + Math.sin(t * Math.PI) * (height * 0.3);
      } else if (pos > 90 && pos < 110) {
        const t = (pos - 90) / 20;
        y = height / 2 - Math.sin(t * Math.PI) * (height * 0.8);
      } else if (pos > 110 && pos < 125) {
        const t = (pos - 110) / 15;
        y = height / 2 + Math.sin(t * Math.PI) * (height * 0.2);
      }
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }
  function animate() {
    offset += 1.5;
    poly.setAttribute('points', generateHeartbeat(1440, 60, offset));
    requestAnimationFrame(animate);
  }
  animate();
}

// ===== COUNTER ANIMATION =====
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      const duration = 1800;
      const start = performance.now();
      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = Math.round(eased * target);
        el.textContent = target >= 1000 ? val.toLocaleString() + '+' : val;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

// ===== AI CHAT DEMO (landing page) =====
function initChatDemo() {
  const chatEl = document.getElementById('demo-chat');
  const typingEl = document.getElementById('typing-indicator');
  if (!chatEl || !typingEl) return;

  const messages = [
    { role: 'ai', text: "I can see you slept only 5.5 hours last night and missed your hydration goal. Your body is signaling fatigue." },
    { role: 'ai', text: "Try warm fluids like herbal tea, 5 minutes of deep breathing, and iron-rich foods like spinach or lentils for lunch. I'll adjust your afternoon routine accordingly." }
  ];

  let idx = 0;
  function showNext() {
    if (idx >= messages.length) return;
    const msg = messages[idx++];
    typingEl.style.display = 'flex';
    setTimeout(() => {
      typingEl.style.display = 'none';
      const div = document.createElement('div');
      div.className = `msg msg-${msg.role}`;
      div.innerHTML = `<div class="msg-bubble">${msg.text}</div>`;
      div.style.opacity = '0';
      div.style.transform = 'translateY(8px)';
      div.style.transition = 'all 0.4s ease';
      chatEl.appendChild(div);
      requestAnimationFrame(() => {
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
      });
      if (idx < messages.length) setTimeout(showNext, 2200);
    }, 1600);
  }

  // Start after a delay
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setTimeout(showNext, 800);
      observer.disconnect();
    }
  }, { threshold: 0.3 });
  observer.observe(chatEl);
}

/* ===== REAL LOGIN SYSTEM ===== */

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const btn =
                loginForm.querySelector('button[type="submit"]');

            btn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

            btn.disabled = true;

            const email =
                document.getElementById("email").value;

            const password =
                document.getElementById("password").value;

            try {

                const result =
                    await VitalisAuth.login(email, password);

                console.log("Login Success:", result);

                btn.innerHTML =
                    'Success <i class="fa-solid fa-check"></i>';

                setTimeout(() => {

                    window.location.href = "dashboard.html";

                }, 800);

            } catch (error) {

                console.error(error);

                alert(error.message || "Login failed");

                btn.innerHTML =
                    'Sign In <i class="fa-solid fa-arrow-right"></i>';

                btn.disabled = false;
            }
        });
    }
});
/* ===== REAL SIGNUP SYSTEM ===== */

document.addEventListener("DOMContentLoaded", () => {

    const signupForm =
        document.getElementById("signupForm");

    if (signupForm) {

        signupForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const btn =
                signupForm.querySelector('button[type="submit"]');

            btn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

            btn.disabled = true;

            const fname =
                document.getElementById("fname").value.trim();

            const lname =
                document.getElementById("lname").value.trim();

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            const confirm =
                document.getElementById("confirm").value;

            if (password !== confirm) {

                alert("Passwords do not match");

                btn.innerHTML =
                    'Create Account';

                btn.disabled = false;

                return;
            }

            try {

                const result =
                    await VitalisAuth.signup({

                        username: `${fname} ${lname}`,

                        email,

                        password
                    });

                console.log("Signup Success:", result);

                btn.innerHTML =
                    'Account Created ✅';

                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 1000);

            } catch (error) {

                console.error(error);

                alert(error.message);

                btn.innerHTML =
                    'Create Account';

                btn.disabled = false;
            }
        });
    }
});