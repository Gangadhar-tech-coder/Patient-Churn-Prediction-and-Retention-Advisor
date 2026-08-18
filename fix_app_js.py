import re

with open("backend/static/app.js", "r") as f:
    js = f.read()

# Replace the Chart.js related code with raw DOM generation

old_charts = """function renderCharts() {
  if (charts.pie) charts.pie.destroy();
  if (charts.hist) charts.hist.destroy();

  const pieCtx = $('riskPieChart').getContext('2d');
  charts.pie = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['High Risk', 'Medium Risk', 'Low Risk'],
      datasets: [{
        data: [STATE.stats.high, STATE.stats.medium, STATE.stats.low],
        backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  // Create histogram data
  const bins = [0,0,0,0,0];
  STATE.dataset.forEach(r => {
    if (r.percentage <= 20) bins[0]++;
    else if (r.percentage <= 40) bins[1]++;
    else if (r.percentage <= 60) bins[2]++;
    else if (r.percentage <= 80) bins[3]++;
    else bins[4]++;
  });

  const histCtx = $('probHistogramChart').getContext('2d');
  charts.hist = new Chart(histCtx, {
    type: 'bar',
    data: {
      labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
      datasets: [{
        label: 'Patients',
        data: bins,
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}"""

new_charts = """function renderCharts() {
  // 1. Patient Risk Distribution (Horizontal or Vertical Bars)
  const maxRiskVal = Math.max(STATE.stats.high, STATE.stats.medium, STATE.stats.low, 1);
  const riskBars = [
    { label: "High Risk", value: STATE.stats.high, color: "#ef4444" },
    { label: "Medium Risk", value: STATE.stats.medium, color: "#f59e0b" },
    { label: "Low Risk", value: STATE.stats.low, color: "#22c55e" }
  ];
  
  let riskBarsHtml = '';
  riskBars.forEach(b => {
    const h = (b.value / maxRiskVal) * 100;
    riskBarsHtml += `
      <div class="bar-item">
        <div class="bar-track">
          <div class="bar-fill" style="height: ${h}%; background: ${b.color};"></div>
        </div>
        <span class="bar-label">${b.label}</span>
        <span class="bar-value">${b.value}</span>
      </div>
    `;
  });
  $('patient-risk-bars').innerHTML = riskBarsHtml;

  // 2. Histogram
  const bins = [0,0,0,0,0];
  STATE.dataset.forEach(r => {
    if (r.percentage <= 20) bins[0]++;
    else if (r.percentage <= 40) bins[1]++;
    else if (r.percentage <= 60) bins[2]++;
    else if (r.percentage <= 80) bins[3]++;
    else bins[4]++;
  });
  
  const histMax = Math.max(...bins, 1);
  const labels = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
  let histHtml = '';
  bins.forEach((val, i) => {
    const h = (val / histMax) * 100;
    histHtml += `
      <div class="hist-bar">
        <div class="hist-track">
          <div class="hist-fill" style="height: ${h}%;"></div>
        </div>
        <span class="hist-label">${labels[i]}</span>
        <span class="hist-value">${val}</span>
      </div>
    `;
  });
  $('prob-histogram').innerHTML = histHtml;

  // 3. SVG Pie Chart
  const total = STATE.stats.total;
  let pieHtml = '';
  if (total > 0) {
    const slices = riskBars.filter(s => s.value > 0);
    const radius = 60;
    const cx = 80, cy = 80;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    
    let svgInner = '';
    slices.forEach((s, i) => {
      const dashLen = (s.value / total) * circumference;
      svgInner += `
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
          stroke="${s.color}" stroke-width="20"
          stroke-dasharray="${dashLen} ${circumference - dashLen}"
          stroke-dashoffset="${-offset}"
          transform="rotate(-90 ${cx} ${cy})"
        />
      `;
      offset += dashLen;
    });
    
    svgInner += `
      <circle cx="${cx}" cy="${cy}" r="46" fill="#fff" />
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="20" font-weight="800" fill="#0f172a">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="#64748b">Patients</text>
    `;
    
    let legendHtml = '';
    slices.forEach(s => {
      legendHtml += `
        <div class="pie-legend-item">
          <span class="pie-dot" style="background: ${s.color}; display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:8px;"></span>
          <span class="pie-label" style="font-size:13px; color:#475569; font-weight:500; margin-right:8px;">${s.label}</span>
          <span class="pie-val" style="font-size:13px; font-weight:700;">${s.value} (${Math.round((s.value / total) * 100)}%)</span>
        </div>
      `;
    });
    
    pieHtml = `
      <svg width="160" height="160" viewBox="0 0 160 160">${svgInner}</svg>
      <div class="pie-legend" style="display:flex; flex-direction:column; gap:12px; margin-left:32px;">${legendHtml}</div>
    `;
  }
  
  $('risk-pie-container').innerHTML = pieHtml;
  $('risk-pie-container').style.display = 'flex';
  $('risk-pie-container').style.alignItems = 'center';
  $('risk-pie-container').style.justifyContent = 'center';
}"""

js = js.replace(old_charts, new_charts)

# Find applyFilters to replace
old_filters = """function applyFilters() {
  let res = STATE.dataset;
  if (STATE.riskFilter !== 'all') {
    res = res.filter(r => r.risk_level.toLowerCase() === STATE.riskFilter);
  }
  if (STATE.searchQuery) {
    res = res.filter(r => String(r.patient_id).toLowerCase().includes(STATE.searchQuery));
  }
  STATE.filteredDataset = res;
  STATE.currentPage = 1;
  renderTable();
}

const PAGE_SIZE = 15;"""

new_filters = """function applyFilters() {
  let res = STATE.dataset;
  
  if (STATE.riskFilter !== 'all') {
    res = res.filter(r => r.risk_level.toLowerCase() === STATE.riskFilter);
  }
  
  if (STATE.genderFilter && STATE.genderFilter !== 'all') {
    res = res.filter(r => r.attributes && r.attributes.Sex && r.attributes.Sex.toLowerCase() === STATE.genderFilter);
  }
  
  if (STATE.ageFilter && STATE.ageFilter !== 'all') {
    res = res.filter(r => {
      if (!r.attributes || !r.attributes.Age) return false;
      const age = parseInt(r.attributes.Age, 10);
      if (isNaN(age)) return false;
      if (STATE.ageFilter === '<30') return age < 30;
      if (STATE.ageFilter === '30-50') return age >= 30 && age <= 50;
      if (STATE.ageFilter === '>50') return age > 50;
      return true;
    });
  }
  
  if (STATE.searchQuery) {
    res = res.filter(r => String(r.patient_id).toLowerCase().includes(STATE.searchQuery));
  }
  
  STATE.filteredDataset = res;
  STATE.currentPage = 1;
  renderTable();
}

function filterCohortGender(val) {
  STATE.genderFilter = val;
  applyFilters();
}

function filterCohortAge(val) {
  STATE.ageFilter = val;
  applyFilters();
}

const PAGE_SIZE = 15;"""

js = js.replace(old_filters, new_filters)

with open("backend/static/app.js", "w") as f:
    f.write(js)
