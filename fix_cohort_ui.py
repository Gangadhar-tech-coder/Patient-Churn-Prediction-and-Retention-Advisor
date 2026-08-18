import re

with open("backend/static/index.html", "r") as f:
    html = f.read()

# Fix the stats row classes
html = html.replace('<div class="cs-stats-row">', '<div class="cohort-summary">')
html = html.replace('<div class="cs-card">', '<div class="cs-card total">')
html = html.replace('<div class="cs-card warning">', '<div class="cs-card medium">')

# Add the pagination UI after the table wrap
pagination_ui = """              <div class="cohort-table-wrap">
                <table class="cohort-table" id="cohort-table">
                  <thead id="cohort-table-head"></thead>
                  <tbody id="cohort-table-body"></tbody>
                </table>
              </div>

              <!-- Pagination Controls -->
              <div id="pagination-controls" class="pagination-controls hidden">
                <button class="page-btn" id="page-prev" onclick="prevPage()">Previous</button>
                <span class="page-info">
                  Page <strong id="page-current">1</strong> of <strong id="page-total">1</strong> (<span id="page-records">0</span> records)
                </span>
                <button class="page-btn" id="page-next" onclick="nextPage()">Next</button>
              </div>"""

html = html.replace("""              <div class="cohort-table-wrap">
                <table class="cohort-table" id="cohort-table">
                  <thead id="cohort-table-head"></thead>
                  <tbody id="cohort-table-body"></tbody>
                </table>
              </div>""", pagination_ui)

with open("backend/static/index.html", "w") as f:
    f.write(html)
