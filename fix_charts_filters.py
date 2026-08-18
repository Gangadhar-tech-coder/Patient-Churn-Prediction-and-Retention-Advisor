import re

with open("backend/static/index.html", "r") as f:
    html = f.read()

# Replace the charts and filters block
old_block = """              <div class="charts-row">
                <div class="chart-card">
                  <h3>Risk Proportion</h3>
                  <div style="height:250px;"><canvas id="riskPieChart"></canvas></div>
                </div>
                <div class="chart-card">
                  <h3>Churn Probability Distribution</h3>
                  <div style="height:250px;"><canvas id="probHistogramChart"></canvas></div>
                </div>
              </div>

              <div class="filter-pills" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h3>Patients Cohort List</h3>
                  <div class="pills-row" style="margin-top:10px;">
                    <button class="pill active" id="pill-all" onclick="filterCohort('all')">All</button>
                    <button class="pill" id="pill-high" onclick="filterCohort('high')">High Risk</button>
                    <button class="pill" id="pill-medium" onclick="filterCohort('medium')">Medium Risk</button>
                    <button class="pill" id="pill-low" onclick="filterCohort('low')">Low Risk</button>
                  </div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                   <input type="text" id="cohort-search" placeholder="Search Patient ID..." onkeyup="filterCohortSearch(event)" style="padding:8px 12px; border-radius:6px; border:1px solid #ccc; min-width:250px;"/>
                </div>
              </div>"""

new_block = """          <div class="charts-row">
            <div class="chart-card">
              <h3>Patient Risk Distribution</h3>
              <div class="bar-chart" id="patient-risk-bars"></div>
            </div>
            <div class="chart-card">
              <h3>Churn Probability Distribution</h3>
              <div class="histogram" id="prob-histogram"></div>
            </div>
          </div>

          <div class="chart-card" style="margin-top: 20px;">
            <h3>Risk Proportion</h3>
            <div class="risk-pie" id="risk-pie-container"></div>
          </div>

          <div class="filter-pills" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3>Patients Cohort List</h3>
              <div class="pills-row" style="margin-top:10px;">
                <button class="pill active" id="pill-all" onclick="filterCohort('all')">All</button>
                <button class="pill" id="pill-high" onclick="filterCohort('high')">High Risk</button>
                <button class="pill" id="pill-medium" onclick="filterCohort('medium')">Medium Risk</button>
                <button class="pill" id="pill-low" onclick="filterCohort('low')">Low Risk</button>
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <select id="cohort-gender-filter" onchange="filterCohortGender(this.value)" style="padding:8px 12px; border-radius:6px; border:1px solid #ccc;">
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <select id="cohort-age-filter" onchange="filterCohortAge(this.value)" style="padding:8px 12px; border-radius:6px; border:1px solid #ccc;">
                <option value="all">All Ages</option>
                <option value="<30">&lt; 30</option>
                <option value="30-50">30 - 50</option>
                <option value=">50">&gt; 50</option>
              </select>
              <input type="text" id="cohort-search" placeholder="Search Patient ID..." onkeyup="filterCohortSearch(event)" style="padding:8px 12px; border-radius:6px; border:1px solid #ccc; min-width:250px;"/>
            </div>
          </div>"""

html = html.replace(old_block, new_block)

# Add another cache buster
html = html.replace("v=3", "v=4")

with open("backend/static/index.html", "w") as f:
    f.write(html)
