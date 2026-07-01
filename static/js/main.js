// ════════════════════════════════════════════════
//   THERMOS AI — Global JS (main.js)
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── Sidebar Mobile Toggle ──
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // ── Scroll Reveal (IntersectionObserver) ──
  const revealEls = document.querySelectorAll('.reveal, .reveal-left');
  if (revealEls.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => observer.observe(el));
  }

  // ── Animated Number Counter ──
  window.animateCounter = function(el, target, duration = 1600, suffix = '', prefix = '') {
    let start = 0;
    const startTime = performance.now();
    const isFloat = String(target).includes('.');
    const decimals = isFloat ? String(target).split('.')[1].length : 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = eased * target;

      el.textContent = prefix + (isFloat ? current.toFixed(decimals) : Math.floor(current).toLocaleString()) + suffix;

      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = prefix + (isFloat ? target.toFixed(decimals) : target.toLocaleString()) + suffix;
    }

    requestAnimationFrame(update);
  };

  // Auto-trigger counters with data-count
  const counterEls = document.querySelectorAll('[data-count]');
  if (counterEls.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          const target  = parseFloat(entry.target.dataset.count);
          const suffix  = entry.target.dataset.suffix || '';
          const prefix  = entry.target.dataset.prefix || '';
          animateCounter(entry.target, target, 1600, suffix, prefix);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counterEls.forEach(el => counterObserver.observe(el));
  }

  // ── Chart.js Global Defaults ──
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#4A6572';
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1A2E35';
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: '700' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.animation.duration = 900;
    Chart.defaults.animation.easing = 'easeOutQuart';
  }

  // ── Particle Background (for Hero) ──
  const particleCanvas = document.getElementById('particleCanvas');
  if (particleCanvas) {
    const ctx = particleCanvas.getContext('2d');
    let particles = [];
    let animId;

    const resize = () => {
      particleCanvas.width  = particleCanvas.offsetWidth;
      particleCanvas.height = particleCanvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * particleCanvas.width;
        this.y = Math.random() * particleCanvas.height;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = -Math.random() * 0.6 - 0.2;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.color = Math.random() > 0.6
          ? `rgba(231,111,81,${this.opacity})`
          : `rgba(77,182,172,${this.opacity})`;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.y < -10 || this.x < -10 || this.x > particleCanvas.width + 10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    // Init particles
    for (let i = 0; i < 70; i++) particles.push(new Particle());

    function animate() {
      ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(animate);
    }
    animate();
  }

  // ── Topbar City Sync ──
  const citySelect = document.getElementById('citySelect');
  if (citySelect) {
    const saved = localStorage.getItem('thermos_city');
    if (saved) citySelect.value = saved;
    citySelect.addEventListener('change', () => {
      localStorage.setItem('thermos_city', citySelect.value);
    });
  }

  // ── Helper: Format Numbers ──
  window.fmtNum = (n, dec = 0) => Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });

  // ── Helper: Severity Color ──
  window.sevColor = (sev) => {
    const map = {
      'Very High': 'sev-very-high',
      'High':      'sev-heat',
      'Moderate':  'sev-moderate',
      'Low':       'sev-low'
    };
    return map[sev] || 'badge-teal';
  };

  // ── Toast Notification ──
  window.showToast = function(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;
      color:white;box-shadow:0 8px 24px rgba(0,0,0,0.18);
      animation:fadeInUp 0.3s ease;
      background:${type==='error'?'#DC2626':type==='warn'?'#D97706':'#2A9D8F'};
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  };
});
