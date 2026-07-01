// THERMOS AI — Zonal Analytics Engine (Real Data)
// Fetches live data from API + interactive charts

let donutChart = null;
let trendChart = null;
let riskChart = null;
let currentZoneData = null;

// Parallax City variables
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize canvas city animation
  initCityCanvas();

  // Fetch available zones for this city
  const city = window.THERMOS?.getCity() || 'Bengaluru, India';
  await populateZoneSelect(city);

  // Load initial zone data
  const firstZone = document.getElementById('zoneSelect')?.value || 'Koramangala';
  await loadZoneData(firstZone, city);

  // Listen to zone selection
  document.getElementById('zoneSelect')?.addEventListener('change', async (e) => {
    await loadZoneData(e.target.value, city);
  });

  // Update date display
  const dateEl = document.querySelector('.live-pill + span');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
});

// Populate zone dropdown from API
async function populateZoneSelect(city) {
  try {
    const res = await fetch(`/api/zones?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    const sel = document.getElementById('zoneSelect');
    if (sel && data.zones) {
      sel.innerHTML = data.zones.map((z, i) =>
        `<option value="${z.name}" ${i === 0 ? 'selected' : ''}>${z.name}</option>`
      ).join('');
    }
  } catch(e) {
    console.warn('Failed to load zones:', e);
  }
}

// Fetch and display zone data from API
async function loadZoneData(zoneName, city) {
  try {
    const res = await fetch(`/api/analytics/${encodeURIComponent(zoneName)}?city=${encodeURIComponent(city)}`);
    const result = await res.json();
    currentZoneData = result;
    updateZonalUI(result);
  } catch(e) {
    console.warn('Analytics API error:', e);
  }
}

// Update all UI components with real data
function updateZonalUI(result) {
  const data = result.data;
  if (!data) return;

  // Set quotes & insights
  document.getElementById('contributorShortQuote').textContent =
    data.ai_insight ? data.ai_insight.substring(0, 80) + '...' : 'Loading...';
  document.getElementById('aiInsightParagraph').textContent = data.ai_insight || '';

  // Set overall impact level & color
  const impactEl = document.getElementById('overallImpactLevel');
  impactEl.textContent = data.heat_impact || 'MODERATE';
  const impact = (data.heat_impact || '').toUpperCase();
  if (impact === 'CRITICAL') impactEl.style.color = 'var(--accent-heat)';
  else if (impact === 'HIGH') impactEl.style.color = 'var(--accent-orange)';
  else if (impact === 'MODERATE') impactEl.style.color = 'var(--accent-warning)';
  else impactEl.style.color = 'var(--accent-green)';

  // Set city averages
  document.getElementById('vegCityAvg').textContent = data.city_avg_vegetation + '%';
  document.getElementById('builtCityAvg').textContent = data.city_avg_density + '%';

  // Animate numeric text stats
  animateTextMetric('vegCoverPercent', data.vegetation_cover + '%');
  animateTextMetric('builtDensityPercent', data.built_up_density + '%');
  animateTextMetric('ndviValText', data.ndvi.toFixed(2));

  // 5 key stats at the bottom
  animateTextMetric('metricHeatRisk', data.heat_risk + '%');
  animateTextMetric('metricGreenDeficit', (data.green_deficit >= 0 ? '+' : '') + data.green_deficit + '%');
  animateTextMetric('metricPeopleExposed', data.population >= 1000 ? (data.population / 1000).toFixed(1) + 'K' : data.population + '');
  animateTextMetric('metricYoYTrend', (data.yoy_trend >= 0 ? '+' : '') + data.yoy_trend + '°C');
  animateTextMetric('metricConfidence', data.confidence + '%');

  // Animate progress bar widths
  document.getElementById('vegBarFill').style.width = data.vegetation_cover + '%';
  document.getElementById('builtBarFill').style.width = data.built_up_density + '%';

  // Animate NDVI indicator position
  document.getElementById('ndviThumbIndicator').style.left = (data.ndvi * 100) + '%';

  // Render Charts with real data
  const contributors = data.heat_contributors || {};
  const donutDataset = [
    contributors.low_vegetation || 0,
    contributors.built_up_density || 0,
    contributors.surface_material || 0,
    contributors.atmospheric || 0,
    contributors.others || 0
  ];
  renderDonutChart(donutDataset);
  renderTrendChart(data.temp_trend || [], result.timeline || []);
  renderRiskDottedChart(result.predicted || []);

  // Update date label
  const dateSpan = document.querySelector('[style*="font-size: 15px"][style*="color: var(--text-secondary)"][style*="font-weight: 600"]');
  if (dateSpan && result.date) dateSpan.textContent = result.date;
}

// Numerical count up animation
function animateTextMetric(elementId, targetStr) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const isPercent = targetStr.includes('%');
  const isTemp = targetStr.includes('°C');
  const isK = targetStr.includes('K');
  const hasMinus = targetStr.startsWith('-');
  const hasPlus = targetStr.startsWith('+');

  let cleanNum = targetStr.replace(/[%°CK\-+]/g, '');
  let end = parseFloat(cleanNum);
  if (isNaN(end)) { el.innerHTML = targetStr; return; }
  let startTime = null;
  const duration = 1200;

  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    let current = progress * end;

    let formatted = current.toFixed(isK || isTemp ? 1 : 0);
    if (hasPlus) formatted = '+' + formatted;
    if (hasMinus) formatted = '-' + formatted;
    if (isPercent) formatted += '%';
    if (isTemp) formatted += '°C';
    if (isK) formatted += 'K';

    el.innerHTML = formatted;

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      el.innerHTML = targetStr;
    }
  };
  window.requestAnimationFrame(step);
}

// Donut Chart Rendering
function renderDonutChart(dataset) {
  const ctx = document.getElementById('contributorsDonutChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (donutChart) donutChart.destroy();

  document.getElementById('centerPercent').textContent = dataset[0] + '%';
  document.getElementById('centerLabel').textContent = 'Low Veg';

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low Vegetation', 'Built-up Density', 'Surface Material', 'Atmospheric Conditions', 'Others'],
      datasets: [{
        data: dataset,
        backgroundColor: ['#FF6B3D', '#2ED47A', '#FFB020', '#7A7BFF', '#2DE2E6'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '80%',
      plugins: { legend: { display: false } }
    }
  });

  // Render Legend Rows
  const legendStack = document.getElementById('contributorsLegendStack');
  legendStack.innerHTML = '';
  const labels = ['Low Vegetation', 'Built-up Density', 'Surface Material', 'Atmospheric Conditions', 'Others'];
  const colors = ['#FF6B3D', '#2ED47A', '#FFB020', '#7A7BFF', '#2DE2E6'];

  labels.forEach((label, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.fontSize = '13px';
    row.style.padding = '4px 6px';
    row.style.borderRadius = '6px';
    row.style.cursor = 'pointer';
    row.style.transition = 'background 0.2s';

    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; color:var(--text-secondary);">
        <span style="width:7px; height:7px; background:${colors[idx]}; border-radius:50%; display:inline-block;"></span>
        <span>${label}</span>
      </div>
      <span style="color:var(--text-primary); font-weight:700;">${dataset[idx]}%</span>
    `;

    row.addEventListener('mouseenter', () => {
      row.style.background = 'rgba(255,255,255,0.02)';
      highlightSegment(idx, true);
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = 'transparent';
      highlightSegment(idx, false);
    });

    legendStack.appendChild(row);
  });
}

function highlightSegment(index, active) {
  if (!donutChart) return;
  if (active) {
    donutChart.setActiveElements([{ datasetIndex: 0, index: index }]);
    donutChart.tooltip.setActiveElements([{ datasetIndex: 0, index: index }]);
  } else {
    donutChart.setActiveElements([]);
    donutChart.tooltip.setActiveElements([]);
  }
  donutChart.update();
}

// 12-Month Temperature trend line (real data)
function renderTrendChart(tempHistory, labels) {
  const ctx = document.getElementById('zonalTempTrendChart');
  if (!ctx || typeof Chart === 'undefined' || !tempHistory.length) return;

  if (trendChart) trendChart.destroy();

  const context = ctx.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 140);
  gradient.addColorStop(0, 'rgba(255, 107, 61, 0.28)');
  gradient.addColorStop(1, 'rgba(255, 107, 61, 0.0)');

  // Find peak
  const peakIdx = tempHistory.indexOf(Math.max(...tempHistory));

  const verticalLinePlugin = {
    id: 'verticalLine',
    afterDraw: (chart) => {
      if (chart.tooltip?._active?.length) return;
      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      const point = meta.data[peakIdx];
      if (!point) return;

      const x = point.x, y = point.y;
      const bottom = chart.scales.y.bottom;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(x, y);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#FF6B3D';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      const tempVal = tempHistory[peakIdx].toFixed(1) + '°C';
      ctx.save();
      ctx.font = 'bold 9.5px Inter';
      const tw = ctx.measureText(tempVal).width;
      const rw = tw + 14, rh = 20;
      const rx = x - rw/2, ry = y - rh - 8;

      ctx.fillStyle = '#07111B';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tempVal, x, ry + rh/2);
      ctx.restore();
    }
  };

  const minVal = Math.floor(Math.min(...tempHistory) - 2);
  const maxVal = Math.ceil(Math.max(...tempHistory) + 2);

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets: [{
        data: tempHistory,
        borderColor: '#FF6B3D',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6C8093', font: { size: 9, family: 'Inter' } } },
        y: { min: minVal, max: maxVal, grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { stepSize: 2, color: '#6C8093', font: { size: 9, family: 'Inter' } } }
      }
    },
    plugins: [verticalLinePlugin]
  });
}

// Risk Dotted prediction line chart (real forecast data)
function renderRiskDottedChart(predictedTrend) {
  const ctx = document.getElementById('zonalRiskDottedChart');
  if (!ctx || typeof Chart === 'undefined' || !predictedTrend.length) return;

  if (riskChart) riskChart.destroy();

  const context = ctx.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 50);
  gradient.addColorStop(0, 'rgba(255, 107, 61, 0.12)');
  gradient.addColorStop(1, 'rgba(255, 107, 61, 0.0)');

  const labels = predictedTrend.map((_, i) => 'M' + (i + 1));

  riskChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: predictedTrend,
        borderColor: '#FF6B3D',
        borderWidth: 1.5,
        borderDash: [5, 5],
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

// ── Futuristic city canvas scan 60fps loop ──
function initCityCanvas() {
  const canvas = document.getElementById('futuristicCityCanvas');
  const wrapper = document.getElementById('cityCanvasWrapper');
  if (!canvas || !wrapper) return;

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = wrapper.clientWidth;
    canvas.height = 130;
  }
  resize();
  window.addEventListener('resize', resize);

  wrapper.addEventListener('mousemove', (e) => {
    const rect = wrapper.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  wrapper.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
  });

  let laserX = 0;
  let laserDir = 1;
  let pulseRadius = 0;
  let pulseGrowing = true;

  const buildings = [
    { xRatio: 0.12, w: 22, h: 45 },
    { xRatio: 0.22, w: 26, h: 65 },
    { xRatio: 0.32, w: 32, h: 55 },
    { xRatio: 0.44, w: 28, h: 80 },
    { xRatio: 0.56, w: 34, h: 70, isHotspot: true },
    { xRatio: 0.68, w: 24, h: 60 },
    { xRatio: 0.78, w: 30, h: 48 },
    { xRatio: 0.88, w: 20, h: 35 }
  ];

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    const baseLine = canvas.height - 15;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, baseLine);
    ctx.lineTo(canvas.width - 10, baseLine);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(46, 226, 230, 0.02)';
    for (let i = 0; i < canvas.width; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i + currentX * 10, baseLine);
      ctx.lineTo(i + currentX * 18 - (canvas.width / 2) * 0.1, canvas.height);
      ctx.stroke();
    }

    buildings.forEach(b => {
      const x = b.xRatio * canvas.width + currentX * 12;
      const y = baseLine - b.h + currentY * 6;

      ctx.save();
      if (b.isHotspot) {
        ctx.strokeStyle = 'rgba(255, 107, 61, 0.8)';
        ctx.fillStyle = 'rgba(255, 107, 61, 0.06)';
        ctx.lineWidth = 1.8;
      } else {
        ctx.strokeStyle = 'rgba(46, 226, 230, 0.28)';
        ctx.fillStyle = 'rgba(46, 226, 230, 0.015)';
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.rect(x - b.w / 2, y, b.w, b.h);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = b.isHotspot ? 'rgba(255, 107, 61, 0.2)' : 'rgba(46, 226, 230, 0.08)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let wh = y + 8; wh < baseLine; wh += 8) {
        ctx.moveTo(x - b.w / 2, wh);
        ctx.lineTo(x + b.w / 2, wh);
      }
      ctx.stroke();
      ctx.restore();
    });

    const hotBuilding = buildings.find(b => b.isHotspot);
    if (hotBuilding) {
      const hX = hotBuilding.xRatio * canvas.width + currentX * 12;
      const hY = baseLine - hotBuilding.h / 2 + currentY * 6;

      if (pulseGrowing) {
        pulseRadius += 0.35;
        if (pulseRadius > 24) pulseGrowing = false;
      } else {
        pulseRadius -= 0.35;
        if (pulseRadius < 8) pulseGrowing = true;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(hX, hY, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 107, 61, ${1 - pulseRadius / 24})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hX, hY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF6B3D';
      ctx.shadowColor = '#FF6B3D';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }

    laserX += 1.8 * laserDir;
    if (laserX > canvas.width || laserX < 0) laserDir *= -1;

    const satX = canvas.width / 2 + currentX * 6;
    const satY = 8;
    ctx.save();
    ctx.fillStyle = '#2DE2E6';
    ctx.beginPath();
    ctx.arc(satX, satY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const beamGrad = ctx.createLinearGradient(satX, satY, laserX, baseLine);
    beamGrad.addColorStop(0, 'rgba(46, 226, 230, 0.85)');
    beamGrad.addColorStop(0.8, 'rgba(46, 226, 230, 0.15)');
    beamGrad.addColorStop(1, 'rgba(46, 226, 230, 0.0)');

    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(satX, satY);
    ctx.lineTo(laserX, baseLine);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(laserX, baseLine, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2DE2E6';
    ctx.shadowColor = '#2DE2E6';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    requestAnimationFrame(draw);
  }

  draw();
}
