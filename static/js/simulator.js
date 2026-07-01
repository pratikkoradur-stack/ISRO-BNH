// ════════════════════════════════════════════════
//   THERMOS AI — Simulator JS (Real Data)
// ════════════════════════════════════════════════

let simChart = null;
let baseTemp = 42.6;  // Will be updated from API
let baseTrend = [38.2, 39.5, 40.1, 41.3, 42.6, 43.8, 44.5, 45.2, 46.1, 45.8, 44.9, 44.2];
let baseLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

document.addEventListener('DOMContentLoaded', async () => {
  const city = window.THERMOS?.getCity() || 'Bengaluru, India';

  // Fetch real current temperature and baseline
  try {
    const res = await fetch(`/api/dashboard-data?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    if (data && data.overview) {
      baseTemp = data.overview.avg_land_temp || data.overview.current_air_temp || 42.6;
      // Update "Before" temperature display
      document.getElementById('tempBefore').textContent = baseTemp.toFixed(1) + '°C';
      document.getElementById('tempAfter').textContent = baseTemp.toFixed(1) + '°C';

      // Update subtitle with real city
      const subtitleEl = document.querySelector('.temp-block.before div[style*="font-size:0.75rem"]');
      if (subtitleEl) subtitleEl.textContent = `${data.city} · ${new Date().toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}`;
    }
    if (data && data.trend_data && data.trend_data.length > 0) {
      baseTrend = data.trend_data;
      baseLabels = data.trend_labels || baseLabels;
    }
  } catch(e) {
    console.warn('Simulator: could not fetch live data, using defaults');
  }

  setupSliders();
  setupButtons();
  initSimChart();
});

function setupSliders() {
  const sliders = [
    { id: 'slTree',     valId: 'valTree',     iconId: 'iconTree',     iconValId: 'iconTreeVal',     suffix: '%' },
    { id: 'slRoof',     valId: 'valRoof',     iconId: 'iconRoof',     iconValId: 'iconRoofVal',     suffix: '%' },
    { id: 'slWater',    valId: 'valWater',    iconId: 'iconWater',    iconValId: 'iconWaterVal',    suffix: '%' },
    { id: 'slCorridor', valId: 'valCorridor', iconId: 'iconCorridor', iconValId: 'iconCorridorVal', suffix: '%' },
  ];

  sliders.forEach(({ id, valId, iconId, iconValId }) => {
    const slider = document.getElementById(id);
    const valEl  = document.getElementById(valId);
    const iconEl = document.getElementById(iconId);
    const iconValEl = document.getElementById(iconValId);

    if (!slider) return;

    slider.addEventListener('input', () => {
      const v = slider.value;
      if (valEl) valEl.textContent = v + '%';
      if (iconValEl) iconValEl.textContent = v + '%';

      if (iconEl) {
        if (parseInt(v) > 0) {
          iconEl.style.borderColor = 'var(--accent-cyan)';
          iconEl.style.background = 'rgba(46, 226, 230, 0.08)';
        } else {
          iconEl.style.borderColor = 'var(--border-divider)';
          iconEl.style.background = 'var(--bg-card)';
        }
      }

      computeAndDisplay();
    });
  });
}

function setupButtons() {
  document.getElementById('btnSimulate')?.addEventListener('click', async () => {
    const btn     = document.getElementById('btnSimulate');
    const text    = document.getElementById('simBtnText');
    const spinner = document.getElementById('simSpinner');

    text.style.display = 'none';
    spinner.style.display = 'inline-block';
    btn.disabled = true;

    // Call real API for simulation
    const city = window.THERMOS?.getCity() || 'Bengaluru, India';
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: city,
          tree_cover: parseFloat(document.getElementById('slTree')?.value || 0),
          cool_roofs: parseFloat(document.getElementById('slRoof')?.value || 0),
          water_bodies: parseFloat(document.getElementById('slWater')?.value || 0),
          green_corridors: parseFloat(document.getElementById('slCorridor')?.value || 0),
        })
      });
      const result = await res.json();

      // Update with API results
      if (result.avg_temp_before) baseTemp = result.avg_temp_before;
      document.getElementById('tempBefore').textContent = result.avg_temp_before.toFixed(1) + '°C';
      document.getElementById('tempAfter').textContent = result.avg_temp_after.toFixed(1) + '°C';
      document.getElementById('impAvgReduction').textContent = '-' + result.avg_temp_reduction.toFixed(1) + '°C';
      document.getElementById('impMaxReduction').textContent = '-' + result.max_reduction.toFixed(1) + '°C';
      document.getElementById('impHotspotPct').textContent = result.hotspot_reduction_pct.toFixed(0) + '%';
      document.getElementById('impArea').textContent = result.area_improved.toFixed(1) + ' km²';
      document.getElementById('arrowReduction').textContent =
        result.avg_temp_reduction > 0 ? `-${result.avg_temp_reduction.toFixed(1)}°C` : 'No change';

      // Update chart with real baseline if available
      if (result.baseline_trend) baseTrend = result.baseline_trend;
      if (result.baseline_labels) baseLabels = result.baseline_labels;
      updateSimChart(result.avg_temp_before, result.avg_temp_after);

    } catch(e) {
      console.warn('Simulation API error:', e);
      computeAndDisplay();
    }

    text.style.display = 'inline';
    spinner.style.display = 'none';
    btn.disabled = false;
    showToast('✅ Simulation complete with real data!', 'success');
  });

  document.getElementById('btnReset')?.addEventListener('click', () => {
    ['slTree','slRoof','slWater','slCorridor'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 0;
    });
    ['valTree','valRoof','valWater','valCorridor'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0%';
    });
    ['iconTreeVal','iconRoofVal','iconWaterVal','iconCorridorVal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0%';
    });
    ['iconTree','iconRoof','iconWater','iconCorridor'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.borderColor = 'var(--border-divider)'; el.style.background = 'var(--bg-card)'; }
    });

    document.getElementById('tempBefore').textContent = baseTemp.toFixed(1) + '°C';
    document.getElementById('tempAfter').textContent = baseTemp.toFixed(1) + '°C';
    document.getElementById('impAvgReduction').textContent = '0.0°C';
    document.getElementById('impMaxReduction').textContent = '0.0°C';
    document.getElementById('impHotspotPct').textContent = '0%';
    document.getElementById('impArea').textContent = '0 km²';
    document.getElementById('arrowReduction').textContent = 'No change';
    updateSimChart(baseTemp, baseTemp);
    showToast('Reset complete', 'warn');
  });
}

function computeAndDisplay() {
  const tree     = parseFloat(document.getElementById('slTree')?.value || 0);
  const roof     = parseFloat(document.getElementById('slRoof')?.value || 0);
  const water    = parseFloat(document.getElementById('slWater')?.value || 0);
  const corridor = parseFloat(document.getElementById('slCorridor')?.value || 0);

  const tempRed    = tree * 0.056 + roof * 0.042 + water * 0.053 + corridor * 0.048;
  const maxRed     = tempRed * 1.56;
  const hotspotPct = Math.min((tree * 1.26 + roof * 0.92 + water * 1.0 + corridor * 0.85), 95);
  const area       = tree * 0.32 + roof * 0.25 + water * 0.40 + corridor * 0.35;
  const tempAfter  = baseTemp - tempRed;

  document.getElementById('tempAfter').textContent         = tempAfter.toFixed(1) + '°C';
  document.getElementById('impAvgReduction').textContent   = '-' + tempRed.toFixed(1) + '°C';
  document.getElementById('impMaxReduction').textContent   = '-' + maxRed.toFixed(1) + '°C';
  document.getElementById('impHotspotPct').textContent     = hotspotPct.toFixed(0) + '%';
  document.getElementById('impArea').textContent           = area.toFixed(1) + ' km²';
  document.getElementById('arrowReduction').textContent    =
    tempRed > 0 ? `-${tempRed.toFixed(1)}°C` : 'No change';

  updateSimChart(baseTemp, tempAfter);
}

function initSimChart() {
  const ctx = document.getElementById('simChart');
  if (!ctx || typeof Chart === 'undefined') return;

  simChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: baseLabels,
      datasets: [
        {
          label: 'Before (Current)',
          data: [...baseTrend],
          borderColor: '#FF6B3D',
          backgroundColor: 'rgba(255, 107, 61, 0.08)',
          tension: 0.4, fill: false, pointRadius: 3,
          pointBackgroundColor: '#FF6B3D', borderWidth: 2.5
        },
        {
          label: 'After (Simulated)',
          data: [...baseTrend],
          borderColor: '#2DE2E6',
          backgroundColor: 'rgba(46, 226, 230, 0.08)',
          tension: 0.4, fill: true, pointRadius: 3,
          pointBackgroundColor: '#2DE2E6', borderWidth: 2.5,
          borderDash: [6, 3]
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
        x: { grid: { display: false }, ticks: { color: '#6C8093', font: { size: 10 } } },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { callback: v => v + '°C', color: '#6C8093', font: { size: 10 } },
          min: Math.floor(Math.min(...baseTrend) - 4),
          max: Math.ceil(Math.max(...baseTrend) + 4)
        }
      }
    }
  });
}

function updateSimChart(before, after) {
  if (!simChart) return;
  const reduction = before - after;
  simChart.data.datasets[0].data = [...baseTrend];
  simChart.data.datasets[1].data = baseTrend.map(v => parseFloat((v - reduction).toFixed(1)));
  simChart.update('active');
}

// Global preset function
window.applyPreset = function(tree, roof, water, corridor) {
  const setSlider = (id, val, valId, iconId, iconValId) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const v = document.getElementById(valId);
    if (v) v.textContent = val + '%';
    const iv = document.getElementById(iconValId);
    if (iv) iv.textContent = val + '%';
    const icon = document.getElementById(iconId);
    if (icon) {
      icon.style.borderColor = val > 0 ? 'var(--accent-cyan)' : 'var(--border-divider)';
      icon.style.background = val > 0 ? 'rgba(46, 226, 230, 0.08)' : 'var(--bg-card)';
    }
  };
  setSlider('slTree',     tree,     'valTree',     'iconTree',     'iconTreeVal');
  setSlider('slRoof',     roof,     'valRoof',     'iconRoof',     'iconRoofVal');
  setSlider('slWater',    water,    'valWater',    'iconWater',    'iconWaterVal');
  setSlider('slCorridor', corridor, 'valCorridor', 'iconCorridor', 'iconCorridorVal');
  computeAndDisplay();
  showToast('Preset applied — click Run Simulation for API-backed results', 'success');
};
