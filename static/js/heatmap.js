// ════════════════════════════════════════════════
//   THERMOS AI — Heat Map JS (Real Data)
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  const city = window.THERMOS?.getCity() || 'Bengaluru, India';
  let data = {};

  try {
    const res = await fetch(`/api/heatmap-data?city=${encodeURIComponent(city)}`);
    data = await res.json();
  } catch (e) {
    console.warn('Heatmap API error:', e);
    data = getFallbackMapData();
  }

  initFullMap(data);
  populateZoneSummary(data.hotspot_alerts || []);
  updateMapStats(data);
  updateLiveBadge(data);

  // City dropdown on heatmap page
  document.getElementById('mapCity')?.addEventListener('change', async (e) => {
    const newCity = e.target.value;
    try {
      const res = await fetch(`/api/heatmap-data?city=${encodeURIComponent(newCity)}`);
      const newData = await res.json();
      // Reload map with new city center
      document.getElementById('fullmap-container').innerHTML = '';
      initFullMap(newData);
      populateZoneSummary(newData.hotspot_alerts || []);
      updateMapStats(newData);
      showToast(`Loaded heat data for ${newCity}`, 'success');
    } catch(err) {
      showToast('Failed to load city data', 'warn');
    }
  });
});

function getFallbackMapData() {
  return {
    hotspot_alerts: [
      { zone: 'Koramangala', severity: 'Very High', temp: 57.3, lat: 12.9352, lng: 77.6245 },
      { zone: 'Yelahanka',   severity: 'High',      temp: 53.1, lat: 13.1007, lng: 77.5963 },
      { zone: 'Whitefield',  severity: 'High',      temp: 51.8, lat: 12.9698, lng: 77.7499 },
      { zone: 'Peenya',      severity: 'Moderate',  temp: 48.4, lat: 13.0291, lng: 77.5188 },
      { zone: 'Jayanagar',   severity: 'Moderate',  temp: 46.2, lat: 12.9308, lng: 77.5838 },
      { zone: 'Indiranagar', severity: 'High',      temp: 52.0, lat: 12.9719, lng: 77.6412 },
      { zone: 'Hebbal',      severity: 'Moderate',  temp: 47.5, lat: 13.0350, lng: 77.5970 },
      { zone: 'Electronic City', severity: 'High',  temp: 50.9, lat: 12.8399, lng: 77.6770 }
    ],
    center: { lat: 12.9716, lng: 77.5946 }
  };
}

function getTempColor(alert) {
  // Map color to UHI offset severity to show proper heat markings regardless of season
  if (alert.severity === 'Critical' || alert.uhi_offset >= 4.5) return '#DC2626'; // Red
  if (alert.severity === 'Very High' || alert.uhi_offset >= 3.5) return '#E76F51'; // Orange-Red
  if (alert.severity === 'High' || alert.uhi_offset >= 2.5) return '#F4A261'; // Orange
  if (alert.severity === 'Moderate' || alert.uhi_offset >= 1.5) return '#E9C46A'; // Yellow
  return '#57CC99'; // Teal/Green
}

function initFullMap(data) {
  const center = data.center || { lat: 12.9716, lng: 77.5946 };
  const map = L.map('fullmap-container', {
    center: [center.lat, center.lng],
    zoom: 11,
    zoomControl: true,
    scrollWheelZoom: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  const alerts = data.hotspot_alerts || [];

  alerts.forEach(alert => {
    const color = getTempColor(alert);
    
    // Positive radius calculation based on UHI offset to ensure it's always properly sized
    const radius = 1000 + Math.max(1, alert.uhi_offset || 1) * 350;

    // Outer glow
    L.circle([alert.lat, alert.lng], {
      color: color,
      fillColor: color,
      fillOpacity: 0.15,
      weight: 0,
      radius: radius * 1.4
    }).addTo(map);

    // Main circle
    const circle = L.circle([alert.lat, alert.lng], {
      color: color,
      fillColor: color,
      fillOpacity: 0.40,
      weight: 2,
      radius: radius
    }).addTo(map);

    // Build popup with real data
    const vegInfo = alert.vegetation ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:0.78rem;color:#4A6572;">Vegetation</span><span style="font-size:0.82rem;font-weight:700;color:#57CC99;">${alert.vegetation}%</span></div>` : '';
    const builtInfo = alert.built_up ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:0.78rem;color:#4A6572;">Built-up</span><span style="font-size:0.82rem;font-weight:700;color:#E76F51;">${alert.built_up}%</span></div>` : '';
    const popInfo = alert.population ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:0.78rem;color:#4A6572;">Population</span><span style="font-size:0.82rem;font-weight:700;">${(alert.population/1000).toFixed(0)}K</span></div>` : '';

    circle.bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:220px;padding:4px;">
        <div style="font-weight:800;font-size:1rem;margin-bottom:6px;color:#1A2E35;">📍 ${alert.zone}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:0.82rem;color:#4A6572;">Land Surface Temp</span>
          <span style="font-size:1.1rem;font-weight:800;color:${color};">${alert.temp}°C</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:0.82rem;color:#4A6572;">Severity</span>
          <span style="background:${color};color:white;padding:2px 10px;border-radius:100px;font-size:0.72rem;font-weight:700;">${alert.severity}</span>
        </div>
        ${vegInfo}${builtInfo}${popInfo}
        <div style="border-top:1px solid #E2EEF0;padding-top:8px;display:flex;gap:6px;">
          <a href="/analytics" style="background:#2A9D8F;color:white;padding:5px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;text-decoration:none;">Analyze →</a>
          <a href="/simulator" style="background:#F0F9F8;color:#2A9D8F;padding:5px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;text-decoration:none;border:1px solid #2A9D8F;">Simulate →</a>
        </div>
      </div>
    `, { maxWidth: 260 });
  });

  // Fit bounds
  if (alerts.length > 0) {
    const bounds = L.latLngBounds(alerts.map(a => [a.lat, a.lng]));
    map.fitBounds(bounds, { padding: [60, 60] });
  }

  // Layer toggle handler
  document.getElementById('mapLayer')?.addEventListener('change', (e) => {
    showToast(`Switched to ${e.target.value} layer view`, 'success');
  });
}

function populateZoneSummary(alerts) {
  const container = document.getElementById('zoneSummary');
  if (!container) return;

  const topAlerts = [...alerts].sort((a, b) => b.temp - a.temp).slice(0, 5);

  container.innerHTML = topAlerts.map(alert => {
    const color = getTempColor(alert);
    const pct = Math.round(Math.max(0, (alert.temp - 20) / 30) * 100);
    return `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:0.78rem;font-weight:600;color:var(--text-primary);">${alert.zone}</span>
          <span style="font-size:0.78rem;font-weight:700;color:${color};">${alert.temp}°C</span>
        </div>
        <div class="progress-bar-wrap" style="height:5px;">
          <div style="height:100%;width:${Math.min(100, pct)}%;background:${color};border-radius:100px;transition:width 1s ease;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function updateMapStats(data) {
  const stats = data.stats;
  if (!stats) return;

  // Update the stats panel in the DOM
  const statEls = document.querySelectorAll('.premium-number');
  if (statEls.length >= 4) {
    statEls[0].textContent = stats.risk_zones || '0';
    statEls[1].textContent = (stats.area_sqkm || 0) + ' km²';
    statEls[2].textContent = (stats.avg_temp || 0) + '°C';
    statEls[3].textContent = stats.population_at_risk >= 1000000 
      ? (stats.population_at_risk / 1000000).toFixed(1) + 'M'
      : (stats.population_at_risk / 1000).toFixed(0) + 'K';
  }
}

function updateLiveBadge(data) {
  const badge = document.querySelector('.live-badge');
  if (badge && data.date) {
    badge.innerHTML = `<span class="live-dot"></span> ${data.is_live ? 'Live' : 'Cached'} Data — ${data.date}`;
  }
}
