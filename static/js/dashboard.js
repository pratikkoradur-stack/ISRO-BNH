// ════════════════════════════════════════════════
//   THERMOS AI — Dashboard JS
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {

  // ── Fetch Dashboard Data ──
  let data = {};
  try {
    const res = await fetch('/api/dashboard-data');
    data = await res.json();
  } catch (e) {
    console.warn('API unavailable, using fallback data');
    data = getFallbackData();
  }

  // ── Initialize Map ──
  initMap(data.heat_points || [], data.hotspot_alerts || []);

  // ── Populate Hotspots Table ──
  populateTable(data.hotspot_alerts || []);

  // ── Sparkline Chart ──
  initSparkline();

  // ── Sort handler ──
  document.getElementById('sortHotspots')?.addEventListener('change', e => {
    const alerts = [...(data.hotspot_alerts || [])];
    const field = e.target.value;
    if (field === 'temp') alerts.sort((a, b) => b.temp - a.temp);
    else if (field === 'zone') alerts.sort((a, b) => a.zone.localeCompare(b.zone));
    else if (field === 'sev') {
      const order = {'Very High': 0, 'High': 1, 'Moderate': 2, 'Low': 3};
      alerts.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
    }
    populateTable(alerts);
  });
});

function getFallbackData() {
  return {
    overview: { avg_land_temp: 42.6, max_hotspot: 57.3, risk_zones: 128, population_at_risk: 2400000 },
    hotspot_alerts: [
      { zone: 'Koramangala', severity: 'Very High', temp: 57.3, lat: 12.9352, lng: 77.6245 },
      { zone: 'Yelahanka',   severity: 'High',      temp: 53.1, lat: 13.1007, lng: 77.5963 },
      { zone: 'Whitefield',  severity: 'High',      temp: 51.8, lat: 12.9698, lng: 77.7499 },
      { zone: 'Peenya',      severity: 'Moderate',  temp: 48.4, lat: 13.0291, lng: 77.5188 },
      { zone: 'Jayanagar',   severity: 'Moderate',  temp: 46.2, lat: 12.9308, lng: 77.5838 },
      { zone: 'Indiranagar', severity: 'High',      temp: 52.0, lat: 12.9719, lng: 77.6412 },
      { zone: 'Hebbal',      severity: 'Moderate',  temp: 47.5, lat: 13.0350, lng: 77.5970 },
      { zone: 'Electronic City', severity: 'High',  temp: 50.9, lat: 12.8399, lng: 77.6770 }
    ]
  };
}

function initMap(heatPoints, alerts) {
  const map = L.map('map-container', {
    center: [12.9716, 77.5946],
    zoom: 11,
    zoomControl: true,
    scrollWheelZoom: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);

  // Color-coded circle markers for heat points
  const heatColors = ['#DC2626','#E76F51','#F4A261','#E9C46A','#57CC99'];
  alerts.forEach(alert => {
    const color = alert.severity === 'Very High' ? '#DC2626'
                : alert.severity === 'High'      ? '#E76F51'
                : alert.severity === 'Moderate'  ? '#E9C46A'
                : '#57CC99';

    const radius = alert.severity === 'Very High' ? 2200
                 : alert.severity === 'High'      ? 1800
                 : alert.severity === 'Moderate'  ? 1400
                 : 1000;

    L.circle([alert.lat, alert.lng], {
      color: color,
      fillColor: color,
      fillOpacity: 0.35,
      weight: 2,
      radius: radius
    }).addTo(map).bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:160px;">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">📍 ${alert.zone}</div>
        <div style="font-size:0.82rem;color:#4A6572;">Temperature: <strong style="color:${color};">${alert.temp}°C</strong></div>
        <div style="font-size:0.82rem;color:#4A6572;margin-top:4px;">
          Severity: <span style="background:${color};color:white;padding:1px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;">${alert.severity}</span>
        </div>
      </div>
    `);
  });

  // Fit bounds to all markers
  if (alerts.length > 0) {
    const bounds = L.latLngBounds(alerts.map(a => [a.lat, a.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function populateTable(alerts) {
  const tbody = document.getElementById('hotspotsBody');
  if (!tbody) return;

  tbody.innerHTML = alerts.map((alert, i) => {
    const sevClass = alert.severity === 'Very High' ? 'sev-very-high'
                   : alert.severity === 'High'      ? 'sev-high'
                   : alert.severity === 'Moderate'  ? 'sev-moderate'
                   : 'sev-low';
    return `
      <tr>
        <td style="font-weight:700;color:var(--text-muted);">${i + 1}</td>
        <td style="font-weight:600;">📍 ${alert.zone}</td>
        <td><span class="badge ${sevClass}">${alert.severity}</span></td>
        <td class="temp-val">🌡️ ${alert.temp}°C</td>
        <td>
          <a href="/analytics" class="btn btn-secondary btn-sm" style="font-size:0.72rem;padding:4px 10px;">
            Analyze →
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function initSparkline() {
  const ctx = document.getElementById('sparklineChart');
  if (!ctx || typeof Chart === 'undefined') return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
      datasets: [{
        data: [38.2, 39.5, 40.1, 41.3, 42.6, 43.8, 44.5, 45.2, 46.1, 45.8, 44.9, 44.2],
        borderColor: '#E76F51',
        backgroundColor: 'rgba(231,111,81,0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}
