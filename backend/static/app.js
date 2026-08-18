const $ = id => document.getElementById(id);
const tokenKey = "patient_churn_token";

let STATE = {
  user: null,
  activeView: 'home',
  dataset: null,
  columns: [],
  stats: null,
  filteredDataset: null,
  currentFilter: 'all',
  searchQuery: ''
};

let charts = {};

// On Load
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(tokenKey);
  if (token) {
    // we assume it's valid for now, or decode it
    // In a real app we'd fetch /api/auth/me but Gangadhar's repo doesn't have it
    STATE.user = { name: "Doctor", email: "doctor@hospital.com" };
    showApp();
  } else {
    showLogin();
  }
});

// Auth
function setLoginMode(mode) {
  if(mode === 'signin') {
    $('tab-signin').classList.add('active');
    $('tab-signup').classList.remove('active');
    $('login-name-field').classList.add('hidden');
    $('login-subtitle').innerText = "Sign in to access your clinical dashboard";
    $('login-submit-btn').innerText = "Sign In to Dashboard";
    $('login-name').required = false;
  } else {
    $('tab-signup').classList.add('active');
    $('tab-signin').classList.remove('active');
    $('login-name-field').classList.remove('hidden');
    $('login-subtitle').innerText = "Create an account to get started";
    $('login-submit-btn').innerText = "Create Account";
    $('login-name').required = true;
  }
  $('login-error').classList.add('hidden');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const mode = $('tab-signin').classList.contains('active') ? 'signin' : 'signup';
  const email = $('login-email').value;
  const password = $('login-password').value;
  const name = $('login-name').value;
  
  $('login-submit-btn').innerText = "Authenticating...";
  $('login-submit-btn').disabled = true;
  
  try {
    const url = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
    const body = mode === 'signup' ? { email, password, name } : { email, password };
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Authentication failed");
    
    localStorage.setItem(tokenKey, data.token);
    STATE.user = data.user || { name: name || "Doctor", email };
    showApp();
  } catch (err) {
    $('login-error').innerText = err.message;
    $('login-error').classList.remove('hidden');
  } finally {
    $('login-submit-btn').innerText = mode === 'signin' ? "Sign In to Dashboard" : "Create Account";
    $('login-submit-btn').disabled = false;
  }
}

function signout() {
  localStorage.removeItem(tokenKey);
  STATE.user = null;
  showLogin();
}

// Navigation
function showLogin() {
  $('login-view').classList.remove('hidden');
  $('app-layout').classList.add('hidden');
}

function showApp() {
  $('login-view').classList.add('hidden');
  $('app-layout').classList.remove('hidden');
  $('nav-user-name').innerText = STATE.user.name;
  $('nav-user-email').innerText = STATE.user.email;
  $('nav-user-initial').innerText = STATE.user.name[0].toUpperCase();
  $('header-greeting').innerText = `Welcome, ${STATE.user.name}`;
  navigate('home');
}

function navigate(view) {
  STATE.activeView = view;
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  $(`nav-${view}`).classList.add('active');
  
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  $(`view-${view}`).classList.remove('hidden');
  
  if (view === 'cohort') renderCohortView();
}

// Upload
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  $('upload-status').classList.remove('hidden');
  $('upload-error').classList.add('hidden');
  
  const fd = new FormData();
  fd.append("file", file);
  
  try {
    const res = await fetch("/api/batch-predict", {
      method: "POST",
      headers: { "Authorization": `Bearer ${localStorage.getItem(tokenKey)}` },
      body: fd
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Upload failed");
    
    STATE.dataset = d.results;
    STATE.columns = d.columns || [];
    STATE.stats = { total: d.total, high: d.high_risk, medium: d.medium_risk, low: d.low_risk };
    
    // Update analytics
    $('analytics-dashboard').classList.remove('hidden');
    $('an-total').innerText = STATE.stats.total;
    $('an-high').innerText = STATE.stats.high;
    $('an-med').innerText = STATE.stats.medium;
    $('an-low').innerText = STATE.stats.low;
    const avgRisk = STATE.dataset.reduce((acc, curr) => acc + curr.percentage, 0) / STATE.stats.total;
    $('an-avg-risk').innerText = avgRisk.toFixed(1) + '%';
    
    navigate('cohort');
    
  } catch (err) {
    $('upload-error').innerText = err.message;
    $('upload-error').classList.remove('hidden');
  } finally {
    $('upload-status').classList.add('hidden');
    e.target.value = ''; // reset input
  }
}

// Cohort View
function renderCohortView() {
  if (!STATE.dataset) {
    $('cohort-content').innerHTML = '<p style="padding:40px; text-align:center;">No data available. Please upload a dataset from the Home view.</p>';
    return;
  }
  
  $('c-total').innerText = STATE.stats.total;
  $('c-high').innerText = STATE.stats.high;
  $('c-med').innerText = STATE.stats.medium;
  $('c-low').innerText = STATE.stats.low;
  
  renderCharts();
  filterCohort('all');
}

function renderCharts() {
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
}

function filterCohortSearch(e) {
  STATE.searchQuery = e.target.value.toLowerCase();
  applyFilters();
}

function filterCohort(level) {
  STATE.currentFilter = level;
  document.querySelectorAll('.pill').forEach(el => el.classList.remove('active'));
  $(`pill-${level}`).classList.add('active');
  applyFilters();
}

function applyFilters() {
  let res = STATE.dataset;
  if (STATE.currentFilter !== 'all') {
    res = res.filter(r => r.risk_level.toLowerCase() === STATE.currentFilter);
  }
  if (STATE.searchQuery) {
    res = res.filter(r => String(r.patient_id).toLowerCase().includes(STATE.searchQuery));
  }
  STATE.filteredDataset = res;
  renderTable();
}

function renderTable() {
  const head = $('cohort-table-head');
  const body = $('cohort-table-body');
  
  let headHtml = '<tr>';
  STATE.columns.forEach(c => headHtml += `<th>${c}</th>`);
  headHtml += '<th>Churn Probability</th><th>Prediction</th><th>Risk Level</th><th>Main Risk Factor</th></tr>';
  head.innerHTML = headHtml;
  
  let bodyHtml = '';
  STATE.filteredDataset.forEach((r, i) => {
    let rowCls = `row-${r.risk_level.toLowerCase()}`;
    let prob = `<td style="font-weight:bold;">${r.percentage}%</td>`;
    let pred = `<td>${r.percentage >= 50 ? 'Likely to Churn' : 'Likely Retained'}</td>`;
    let risk = `<td><span class="risk-tag ${r.risk_level.toLowerCase()}">${r.risk_level} RISK</span></td>`;
    let reason = `<td class="reason-cell">${r.primary_churn_reason}</td>`;
    
    let attrHtml = '';
    STATE.columns.forEach(c => {
      let val = r.attributes ? r.attributes[c] : (r.patient_id || `P-${i}`);
      attrHtml += `<td>${val}</td>`;
    });
    
    bodyHtml += `<tr class="hover-row ${rowCls}" onclick="viewPatient('${r.patient_id}')">
      ${attrHtml}${prob}${pred}${risk}${reason}
    </tr>`;
  });
  body.innerHTML = bodyHtml;
}

// Advisor View
function viewPatient(id) {
  const patient = STATE.dataset.find(p => p.patient_id === id);
  if(!patient) return;
  
  $('adv-patient-id').innerText = patient.patient_id;
  
  // Render details
  const advice = patient.retention_advice;
  const reason = patient.primary_churn_reason;
  const interventions = patient.interventions || [];
  
  let interventionsHtml = '';
  if (interventions.length > 0) {
    interventions.forEach(i => {
      interventionsHtml += `
      <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #3b82f6;">
        <strong>${i.icon} ${i.priority.toUpperCase()} PRIORITY:</strong> ${i.text}
      </div>`;
    });
  } else {
    interventionsHtml = `
    <div style="background:#f8fafc; padding:15px; border-radius:8px; border-left:4px solid #3b82f6;">
      <strong>Action:</strong> ${advice}
    </div>`;
  }
  
  $('adv-content').innerHTML = `
    <div style="display:flex; gap:20px;">
      <div style="flex:1; background:white; padding:20px; border-radius:12px; border:1px solid #e5e7eb;">
        <h3 style="font-size:24px; font-weight:700; color:#1e293b; margin-bottom:10px;">${patient.percentage}% Risk</h3>
        <p style="color:#64748b;">${reason}</p>
      </div>
      <div style="flex:2; background:white; padding:20px; border-radius:12px; border:1px solid #e5e7eb;">
        <h3 style="margin-bottom:15px; font-size:16px;">Recommended Interventions</h3>
        ${interventionsHtml}
      </div>
    </div>
    
    <h3 style="margin-top:30px; margin-bottom:15px;">Patient Attributes</h3>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px;">
      ${Object.entries(patient.attributes || {}).map(([k,v]) => `
        <div style="background:#f1f5f9; padding:12px; border-radius:8px;">
          <div style="font-size:12px; color:#64748b; margin-bottom:4px; text-transform:uppercase;">${k}</div>
          <div style="font-weight:600; color:#1e293b;">${v}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  navigate('advisor');
}
