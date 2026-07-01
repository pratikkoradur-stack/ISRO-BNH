// ════════════════════════════════════════════════
//   THERMOS AI — Recommendations JS (Real Data)
// ════════════════════════════════════════════════

let STRATEGIES = [];
let BASE_TREND = [];
let MONTHS = [];
let recChart = null;
let activeIdx = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const city = window.THERMOS?.getCity() || 'Bengaluru, India';

  // Fetch real recommendations data
  try {
    const res = await fetch(`/api/recommendations?city=${encodeURIComponent(city)}`);
    const data = await res.json();

    if (data.strategies) {
      STRATEGIES = data.strategies.map(s => ({
        name: s.name,
        icon: s.icon,
        tempRed: s.temp_reduction,
        energy: s.energy_savings,
        cost: '₹' + s.cost_crore + ' Cr',
        ratio: s.benefit_ratio,
        pop: s.population >= 1000000 ? (s.population / 1000000).toFixed(1) + 'M' : (s.population / 1000).toFixed(0) + 'K',
        recommended: s.recommended || false
      }));
      // Sort: recommended first, then by temp reduction
      STRATEGIES.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return Math.abs(b.tempRed) - Math.abs(a.tempRed);
      });
    }

    if (data.baseline && data.baseline.length > 0) {
      BASE_TREND = data.baseline;
    } else {
      BASE_TREND = [38.2, 39.5, 40.1, 41.3, 42.6, 43.8, 44.5, 45.2, 46.1, 45.8, 44.9, 44.2];
    }

    MONTHS = data.timeline && data.timeline.length > 0 ? data.timeline : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  } catch(e) {
    console.warn('Recommendations API error:', e);
    // Fallback
    STRATEGIES = [
      { name: 'Hybrid Green + Cool Roof', icon: '🏙️', tempRed: -6.5, energy: '32.4%', cost: '₹75 Cr', ratio: 4.1, pop: '3.2M', recommended: true },
      { name: 'Increase Tree Cover',       icon: '🌳', tempRed: -2.8, energy: '18.7%', cost: '₹48 Cr', ratio: 3.2, pop: '1.9M', recommended: false },
      { name: 'Cool Roof Implementation',  icon: '🏠', tempRed: -2.1, energy: '14.2%', cost: '₹32 Cr', ratio: 2.8, pop: '1.4M', recommended: false },
      { name: 'Green Corridors',           icon: '🌿', tempRed: -1.9, energy: '11.5%', cost: '₹25 Cr', ratio: 2.4, pop: '1.1M', recommended: false },
      { name: 'Water Bodies Restoration',  icon: '💧', tempRed: -1.6, energy: '9.8%',  cost: '₹20 Cr', ratio: 2.1, pop: '0.9M', recommended: false }
    ];
    BASE_TREND = [38.2, 39.5, 40.1, 41.3, 42.6, 43.8, 44.5, 45.2, 46.1, 45.8, 44.9, 44.2];
    MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  }

  renderStrategyList();
  renderStrategyTable();
  initRecChart();
  selectStrategy(0);
});

function renderStrategyList() {
  const container = document.getElementById('strategyList');
  if (!container) return;

  container.innerHTML = STRATEGIES.map((s, i) => `
    <div class="rec-card ${i === activeIdx ? 'active' : ''}" id="recCard${i}" onclick="selectStrategy(${i})">
      <div class="rec-icon" style="font-size:1.5rem; flex-shrink:0;">${s.icon}</div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span class="rec-name" style="font-size:0.85rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; flex:1; margin:0;">${s.name}</span>
          ${s.recommended ? `<span class="badge badge-teal" style="font-size:0.55rem; padding:2px 6px; flex-shrink:0;">★ Best</span>` : ''}
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
          <span>Temp: <strong style="color:var(--accent-teal);">${s.tempRed}°C</strong></span>
          <span>Energy: <strong style="color:var(--accent-green);">${s.energy}</strong></span>
          <span>Cost: <strong style="color:var(--text-primary); opacity:0.85;">${s.cost}</strong></span>
        </div>
        <div style="margin-top:6px; height:3px; background:rgba(255,255,255,0.05); border-radius:100px; overflow:hidden;">
          <div style="height:100%; width:${(Math.abs(s.tempRed)/6.5)*100}%; background:var(--accent-cyan); border-radius:100px;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function selectStrategy(idx) {
  activeIdx = idx;
  const s = STRATEGIES[idx];

  STRATEGIES.forEach((_, i) => {
    const card = document.getElementById(`recCard${i}`);
    if (card) card.classList.toggle('active', i === idx);
  });

  updateRecChart(s.tempRed);
}

function initRecChart() {
  const ctx = document.getElementById('recChart');
  if (!ctx || typeof Chart === 'undefined') return;

  const minVal = Math.floor(Math.min(...BASE_TREND) - 6);
  const maxVal = Math.ceil(Math.max(...BASE_TREND) + 2);

  recChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Baseline (No intervention)',
          data: [...BASE_TREND],
          borderColor: '#E76F51',
          backgroundColor: 'rgba(231,111,81,0.06)',
          tension: 0.4, fill: false,
          pointRadius: 2, borderWidth: 2, borderDash: [5,3]
        },
        {
          label: 'With Strategy Applied',
          data: [...BASE_TREND],
          borderColor: '#2DE2E6',
          backgroundColor: 'rgba(46,226,230,0.10)',
          tension: 0.4, fill: true,
          pointRadius: 3, pointBackgroundColor: '#2DE2E6', borderWidth: 2.5
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}°C` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { callback: v => v + '°C', font: { size: 10 } },
          min: minVal, max: maxVal
        }
      }
    }
  });

  updateRecChart(STRATEGIES[0]?.tempRed || 0);
}

function updateRecChart(tempRed) {
  if (!recChart) return;
  const reduction = Math.abs(tempRed);
  recChart.data.datasets[1].data = BASE_TREND.map(v => parseFloat((v - reduction).toFixed(1)));
  recChart.update('active');
}

function renderStrategyTable() {
  const tbody = document.getElementById('strategyTable');
  if (!tbody) return;

  tbody.innerHTML = STRATEGIES.map((s, i) => `
    <tr style="cursor:pointer;" onclick="selectStrategy(${i})">
      <td style="font-weight:600;">${s.icon} ${s.name}${s.recommended ? ' <span class="badge badge-teal" style="font-size:0.65rem;padding:2px 6px;">★ Best</span>' : ''}</td>
      <td style="font-weight:700;color:var(--accent-teal);">${s.tempRed}°C</td>
      <td style="font-weight:700;color:var(--accent-green);">${s.energy}</td>
      <td style="font-weight:600;">${s.cost}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:700;color:var(--accent-teal);">${s.ratio}x</span>
          <div style="flex:1;background:var(--border);border-radius:100px;height:5px;min-width:60px;">
            <div style="height:100%;width:${(s.ratio/4.1)*100}%;background:var(--gradient-teal);border-radius:100px;"></div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}
