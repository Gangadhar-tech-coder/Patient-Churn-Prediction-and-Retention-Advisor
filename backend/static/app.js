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
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem(tokenKey);
  if (token) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        STATE.user = data.user;
        showApp();
        return;
      }
    } catch(e) {}
    // If we fail, clear token and show login
    localStorage.removeItem(tokenKey);
  }
  showLogin();
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
    $('cohort-content').classList.add('hidden');
    // Don't show anything, or we could add a cohort-empty div
    return;
  }
  $('cohort-content').classList.remove('hidden');
  
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
  
  $('adv-empty').classList.add('hidden');
  $('adv-card').classList.remove('hidden');
  
  $('adv-patient-id').innerText = patient.patient_id || 'Unknown';
  $('adv-icon').innerText = (patient.patient_id || 'P').charAt(0).toUpperCase();
  $('adv-prob').innerText = patient.percentage + '%';
  
  const rt = $('adv-risk-tag');
  rt.innerText = patient.risk_level + ' Risk';
  rt.style.background = patient.risk_level === 'High' ? '#ef4444' : (patient.risk_level === 'Medium' ? '#f59e0b' : '#22c55e');
  
  $('adv-status').innerText = patient.percentage >= 50 ? 'Likely to Churn' : 'Likely Retained';
  $('adv-reason').innerText = patient.primary_churn_reason;
  $('adv-advice').innerText = patient.retention_advice;
  
  let attrHtml = '';
  if (patient.attributes) {
    Object.entries(patient.attributes).forEach(([k, v]) => {
      attrHtml += `
      <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px; background:#fafafa;">
        <div style="font-size:11px; font-weight:bold; color:#6b7280; margin-bottom:6px; letter-spacing:0.5px;">${k.toUpperCase()}</div>
        <div style="font-size:15px; font-weight:bold; color:#111827;">${v !== null && v !== undefined ? v : 'N/A'}</div>
      </div>`;
    });
  }
  $('adv-attributes').innerHTML = attrHtml;
  
  navigate('advisor');
}
