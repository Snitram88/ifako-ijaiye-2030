/* ======================
AUTH CHECK
====================== */
/* ======================
API BASE URL
====================== */

const API_BASE = "https://ifako-ijaiye-2030.onrender.com";

const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.href = "admin-login.html";
}

/* ======================
DATA STORAGE
====================== */

let youthData = [];
let artisanData = [];
let partnerData = [];

let youthMonthlyChartInstance = null;
let youthTrackChartInstance = null;
let artisanCategoryChartInstance = null;
let partnerInterestChartInstance = null;
let statusDistributionChartInstance = null;
let pipelineConversionChartInstance = null;

const STATUS_OPTIONS = ["new", "reviewed", "contacted", "approved", "rejected"];
const ASSIGNED_ADMIN_OPTIONS = ["", "Admin", "Tosin", "Operations"];
const noteSaveTimers = {};

/* ======================
UTILS
====================== */

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (!el) return;
  el.textContent = new Date().toLocaleString();
}

function updateTotalSubmissions() {
  const total = youthData.length + artisanData.length + partnerData.length;
  const totalEl = document.getElementById("totalSubmissions");
  if (totalEl) {
    totalEl.textContent = total;
  }
}

function updateStatusMetrics() {
  const allRecords = [...youthData, ...artisanData, ...partnerData];

  const approved = allRecords.filter((item) => item.status === "approved").length;
  const pending = allRecords.filter((item) => item.status === "new").length;
  const contacted = allRecords.filter((item) => item.status === "contacted").length;
  const reviewed = allRecords.filter((item) => item.status === "reviewed").length;
  const rejected = allRecords.filter((item) => item.status === "rejected").length;

  const approvedEl = document.getElementById("approvedCount");
  const pendingEl = document.getElementById("pendingCount");
  const contactedEl = document.getElementById("contactedCount");
  const reviewedEl = document.getElementById("reviewedCount");
  const rejectedEl = document.getElementById("rejectedCount");

  if (approvedEl) approvedEl.textContent = approved;
  if (pendingEl) pendingEl.textContent = pending;
  if (contactedEl) contactedEl.textContent = contacted;
  if (reviewedEl) reviewedEl.textContent = reviewed;
  if (rejectedEl) rejectedEl.textContent = rejected;
}

function normalizeLabel(value, fallback = "Unspecified") {
  const text = String(value || "").trim();
  return text ? text : fallback;
}

function countBy(items, getKey) {
  const counts = {};
  items.forEach((item) => {
    const key = normalizeLabel(getKey(item));
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function buildMonthSeries(items, dateKey) {
  const counts = {};

  items.forEach((item) => {
    const raw = item[dateKey];
    if (!raw) return;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;

    const monthKey = date.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });

    counts[monthKey] = (counts[monthKey] || 0) + 1;
  });

  const entries = Object.entries(counts).sort((a, b) => {
    const aDate = new Date(a[0]);
    const bDate = new Date(b[0]);
    return aDate - bDate;
  });

  return {
    labels: entries.map((entry) => entry[0]),
    values: entries.map((entry) => entry[1]),
  };
}

function destroyChart(chartInstance) {
  if (chartInstance) {
    chartInstance.destroy();
  }
}

function getChartColors() {
  return {
    green: "#19c37d",
    teal: "#2dd4bf",
    blue: "#38bdf8",
    purple: "#8b5cf6",
    amber: "#f59e0b",
    pink: "#ec4899",
    slate: "#94a3b8",
    red: "#ef4444",
  };
}

function createBarChart(canvasId, labels, values, label) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const colors = getChartColors();

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: [
            colors.green,
            colors.teal,
            colors.blue,
            colors.purple,
            colors.amber,
            colors.pink,
            colors.slate,
            colors.red,
          ],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#d7e6ff",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#a9b8d3",
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#a9b8d3",
            precision: 0,
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
      },
    },
  });
}

function createDoughnutChart(canvasId, labels, values) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const colors = getChartColors();

  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            colors.green,
            colors.teal,
            colors.blue,
            colors.purple,
            colors.amber,
            colors.pink,
            colors.slate,
            colors.red,
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#d7e6ff",
            padding: 16,
          },
        },
      },
    },
  });
}

function createStackedBarChart(canvasId, labels, approvedValues, nonApprovedValues) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const colors = getChartColors();

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Approved",
          data: approvedValues,
          backgroundColor: colors.green,
          borderRadius: 6,
        },
        {
          label: "Other Statuses",
          data: nonApprovedValues,
          backgroundColor: colors.slate,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#d7e6ff",
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: "#a9b8d3",
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: "#a9b8d3",
            precision: 0,
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
      },
    },
  });
}

function getStatusBadgeClass(status) {
  const value = normalizeLabel(status, "new").toLowerCase();
  return `status-badge status-${value}`;
}

function buildStatusOptions(selectedStatus) {
  return STATUS_OPTIONS.map((status) => `
    <option value="${status}" ${status === selectedStatus ? "selected" : ""}>
      ${status.charAt(0).toUpperCase() + status.slice(1)}
    </option>
  `).join("");
}

function buildAssignedAdminOptions(selectedAdmin) {
  return ASSIGNED_ADMIN_OPTIONS.map((admin) => {
    const label = admin || "Unassigned";
    return `
      <option value="${admin}" ${admin === selectedAdmin ? "selected" : ""}>
        ${label}
      </option>
    `;
  }).join("");
}

function setNoteStatus(type, id, text, className = "") {
  const el = document.getElementById(`${type}-note-status-${id}`);
  if (!el) return;
  el.textContent = text;
  el.className = `note-status ${className}`.trim();
}

/* ======================
FETCH HELPERS
====================== */

async function secureFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: "Bearer " + token,
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("adminToken");
    window.location.href = "admin-login.html";
    return null;
  }

  return response.json();
}

/* ======================
LOAD DATA
====================== */

async function loadYouth() {
  const data = await secureFetch(API_BASE + "/api/admin/youth");
  if (!data) return;

  youthData = data;

  const youthCountEl = document.getElementById("youthCount");
  if (youthCountEl) youthCountEl.textContent = youthData.length;

  renderYouth(getFilteredYouth());
}

async function loadArtisans() {
  const data = await secureFetch(API_BASE + "/api/admin/artisans");
  if (!data) return;

  artisanData = data;

  const artisanCountEl = document.getElementById("artisanCount");
  if (artisanCountEl) artisanCountEl.textContent = artisanData.length;

  renderArtisans(getFilteredArtisans());
}

async function loadPartners() {
  const data = await secureFetch(API_BASE + "/api/admin/partners");
  if (!data) return;

  partnerData = data;

  const partnerCountEl = document.getElementById("partnerCount");
  if (partnerCountEl) partnerCountEl.textContent = partnerData.length;

  renderPartners(getFilteredPartners());
}

async function refreshAllData() {
  await Promise.all([loadYouth(), loadArtisans(), loadPartners()]);
  renderAnalytics();
  updateTotalSubmissions();
  updateStatusMetrics();
  setLastUpdated();
}

/* ======================
FILTER HELPERS
====================== */

function getSelectedStatusFilter(elementId) {
  const el = document.getElementById(elementId);
  return el ? el.value.toLowerCase() : "";
}

function getFilteredYouth() {
  const input = document.getElementById("searchYouth");
  const query = input ? input.value.toLowerCase() : "";
  const statusFilter = getSelectedStatusFilter("statusFilterYouth");

  return youthData.filter((row) => {
    const matchesSearch =
      row.full_name.toLowerCase().includes(query) ||
      row.email.toLowerCase().includes(query) ||
      row.phone.toLowerCase().includes(query) ||
      row.track.toLowerCase().includes(query) ||
      normalizeLabel(row.status, "new").toLowerCase().includes(query) ||
      normalizeLabel(row.assigned_admin, "").toLowerCase().includes(query) ||
      normalizeLabel(row.notes, "").toLowerCase().includes(query);

    const matchesStatus =
      !statusFilter || normalizeLabel(row.status, "new").toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });
}

function getFilteredArtisans() {
  const input = document.getElementById("searchArtisan");
  const query = input ? input.value.toLowerCase() : "";
  const statusFilter = getSelectedStatusFilter("statusFilterArtisan");

  return artisanData.filter((row) => {
    const matchesSearch =
      row.business_name.toLowerCase().includes(query) ||
      row.contact_name.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query) ||
      row.location.toLowerCase().includes(query) ||
      normalizeLabel(row.status, "new").toLowerCase().includes(query) ||
      normalizeLabel(row.assigned_admin, "").toLowerCase().includes(query) ||
      normalizeLabel(row.notes, "").toLowerCase().includes(query);

    const matchesStatus =
      !statusFilter || normalizeLabel(row.status, "new").toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });
}

function getFilteredPartners() {
  const input = document.getElementById("searchPartner");
  const query = input ? input.value.toLowerCase() : "";
  const statusFilter = getSelectedStatusFilter("statusFilterPartner");

  return partnerData.filter((row) => {
    const matchesSearch =
      row.full_name.toLowerCase().includes(query) ||
      row.organization.toLowerCase().includes(query) ||
      row.email.toLowerCase().includes(query) ||
      row.interest.toLowerCase().includes(query) ||
      normalizeLabel(row.status, "new").toLowerCase().includes(query) ||
      normalizeLabel(row.assigned_admin, "").toLowerCase().includes(query) ||
      normalizeLabel(row.notes, "").toLowerCase().includes(query);

    const matchesStatus =
      !statusFilter || normalizeLabel(row.status, "new").toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });
}

/* ======================
STATUS / NOTES / ASSIGNMENT
====================== */

async function updateStatus(type, id) {
  const selectEl = document.getElementById(`${type}-status-${id}`);
  if (!selectEl) return;

  const status = selectEl.value;

  const result = await secureFetch(`${API_BASE}/api/admin/${type}/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!result) return;

  if (result.success) {
    await refreshAllData();
  } else {
    alert(result.message || "Failed to update status.");
  }
}

async function saveNotes(type, id, silent = false) {
  const notesEl = document.getElementById(`${type}-notes-${id}`);
  if (!notesEl) return;

  const notes = notesEl.value;

  if (silent) {
    setNoteStatus(type, id, "Saving...", "saving");
  }

  const result = await secureFetch(`${API_BASE}/api/admin/${type}/${id}/notes`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });

  if (!result) return;

  if (result.success) {
    setNoteStatus(type, id, "Saved", "saved");
    if (!silent) {
      await refreshAllData();
    }
  } else {
    setNoteStatus(type, id, "Error saving", "error");
    if (!silent) {
      alert(result.message || "Failed to save notes.");
    }
  }
}

function queueAutoSave(type, id) {
  const key = `${type}-${id}`;

  setNoteStatus(type, id, "Typing...", "");

  if (noteSaveTimers[key]) {
    clearTimeout(noteSaveTimers[key]);
  }

  noteSaveTimers[key] = setTimeout(() => {
    saveNotes(type, id, true);
  }, 900);
}

async function assignAdmin(type, id) {
  const adminEl = document.getElementById(`${type}-assign-${id}`);
  if (!adminEl) return;

  const admin = adminEl.value;

  const result = await secureFetch(`${API_BASE}/api/admin/${type}/${id}/assign`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ admin }),
  });

  if (!result) return;

  if (result.success) {
    await refreshAllData();
  } else {
    alert(result.message || "Failed to assign admin.");
  }
}

/* ======================
RENDER TABLES
====================== */

function renderYouth(data) {
  const table = document.querySelector("#youthTable tbody");

  if (!data.length) {
    table.innerHTML = `<tr><td colspan="15" class="empty-state">No youth applications found</td></tr>`;
    return;
  }

  const rows = data.map((row) => `
    <tr>
      <td>${escapeHtml(row.full_name)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${escapeHtml(row.phone)}</td>
      <td>${escapeHtml(normalizeLabel(row.gender))}</td>
      <td>${escapeHtml(normalizeLabel(row.age))}</td>
      <td>${escapeHtml(normalizeLabel(row.employment_status))}</td>
      <td>${escapeHtml(normalizeLabel(row.location_detail))}</td>
      <td>${escapeHtml(normalizeLabel(row.sustainability_interest))}</td>
      <td>${escapeHtml(row.track)}</td>
      <td>${escapeHtml(row.goals)}</td>

      <td>
        <span class="${getStatusBadgeClass(row.status)}">
          ${escapeHtml(normalizeLabel(row.status,"new"))}
        </span>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <select class="status-select" id="youth-status-${row.id}">
            ${buildStatusOptions(normalizeLabel(row.status,"new").toLowerCase())}
          </select>
          <button class="admin-button" onclick="updateStatus('youth',${row.id})">
            Save
          </button>
        </div>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <select class="status-select" id="youth-assign-${row.id}">
            ${buildAssignedAdminOptions(normalizeLabel(row.assigned_admin,""))}
          </select>
          <button class="admin-button" onclick="assignAdmin('youth',${row.id})">
            Assign
          </button>
        </div>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <textarea
            id="youth-notes-${row.id}"
            class="notes-input"
            oninput="queueAutoSave('youth',${row.id})"
          >${escapeHtml(normalizeLabel(row.notes,""))}</textarea>
          <div id="youth-note-status-${row.id}" class="note-status"></div>
        </div>
      </td>

      <td>${new Date(row.created_at).toLocaleString()}</td>
    </tr>
  `).join("");

  table.innerHTML = rows;
}


function renderArtisans(data) {
  const table = document.querySelector("#artisanTable tbody");

  if (!data.length) {
    table.innerHTML = `<tr><td colspan="16" class="empty-state">No artisan registrations found</td></tr>`;
    return;
  }

  const rows = data.map((row) => `
    <tr>
      <td>${escapeHtml(row.business_name)}</td>
      <td>${escapeHtml(row.contact_name)}</td>
      <td>${escapeHtml(normalizeLabel(row.email))}</td>
      <td>${escapeHtml(normalizeLabel(row.phone))}</td>
      <td>${escapeHtml(normalizeLabel(row.gender))}</td>
      <td>${escapeHtml(normalizeLabel(row.age))}</td>
      <td>${escapeHtml(normalizeLabel(row.employment_status))}</td>
      <td>${escapeHtml(normalizeLabel(row.location_detail))}</td>
      <td>${escapeHtml(normalizeLabel(row.sustainability_interest))}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.description)}</td>

      <td>
        <span class="${getStatusBadgeClass(row.status)}">
          ${escapeHtml(normalizeLabel(row.status,"new"))}
        </span>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <select class="status-select" id="artisans-status-${row.id}">
            ${buildStatusOptions(normalizeLabel(row.status,"new").toLowerCase())}
          </select>
          <button class="admin-button" onclick="updateStatus('artisans',${row.id})">
            Save
          </button>
        </div>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <select class="status-select" id="artisans-assign-${row.id}">
            ${buildAssignedAdminOptions(normalizeLabel(row.assigned_admin,""))}
          </select>
          <button class="admin-button" onclick="assignAdmin('artisans',${row.id})">
            Assign
          </button>
        </div>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <textarea
            id="artisans-notes-${row.id}"
            class="notes-input"
            oninput="queueAutoSave('artisans',${row.id})"
          >${escapeHtml(normalizeLabel(row.notes,""))}</textarea>
          <div id="artisans-note-status-${row.id}" class="note-status"></div>
        </div>
      </td>

      <td>${new Date(row.created_at).toLocaleString()}</td>
    </tr>
  `).join("");

  table.innerHTML = rows;
}


function renderPartners(data) {
  const table = document.querySelector("#partnerTable tbody");

  if (!data.length) {
    table.innerHTML = `<tr><td colspan="16" class="empty-state">No partnership inquiries found</td></tr>`;
    return;
  }

  const rows = data.map((row) => `
    <tr>
      <td>${escapeHtml(row.full_name)}</td>
      <td>${escapeHtml(row.organization)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${escapeHtml(normalizeLabel(row.phone))}</td>
      <td>${escapeHtml(normalizeLabel(row.gender))}</td>
      <td>${escapeHtml(normalizeLabel(row.age))}</td>
      <td>${escapeHtml(normalizeLabel(row.employment_status))}</td>
      <td>${escapeHtml(normalizeLabel(row.location_detail))}</td>
      <td>${escapeHtml(normalizeLabel(row.sustainability_interest))}</td>
      <td>${escapeHtml(row.interest)}</td>
      <td>${escapeHtml(row.message)}</td>

      <td>
        <span class="${getStatusBadgeClass(row.status)}">
          ${escapeHtml(normalizeLabel(row.status,"new"))}
        </span>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <select class="status-select" id="partners-status-${row.id}">
            ${buildStatusOptions(normalizeLabel(row.status,"new").toLowerCase())}
          </select>
          <button class="admin-button" onclick="updateStatus('partners',${row.id})">
            Save
          </button>
        </div>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <select class="status-select" id="partners-assign-${row.id}">
            ${buildAssignedAdminOptions(normalizeLabel(row.assigned_admin,""))}
          </select>
          <button class="admin-button" onclick="assignAdmin('partners',${row.id})">
            Assign
          </button>
        </div>
      </td>

      <td>
        <div style="display:grid; gap:8px;">
          <textarea
            id="partners-notes-${row.id}"
            class="notes-input"
            oninput="queueAutoSave('partners',${row.id})"
          >${escapeHtml(normalizeLabel(row.notes,""))}</textarea>
          <div id="partners-note-status-${row.id}" class="note-status"></div>
        </div>
      </td>

      <td>${new Date(row.created_at).toLocaleString()}</td>
    </tr>
  `).join("");

  table.innerHTML = rows;
}

/* ======================
ANALYTICS / CHARTS
====================== */

function renderAnalytics() {
  renderYouthMonthlyChart();
  renderYouthTrackChart();
  renderArtisanCategoryChart();
  renderPartnerInterestChart();
  renderStatusDistributionChart();
  renderPipelineConversionChart();
}

function renderYouthMonthlyChart() {
  const { labels, values } = buildMonthSeries(youthData, "created_at");

  destroyChart(youthMonthlyChartInstance);
  youthMonthlyChartInstance = createBarChart(
    "youthMonthlyChart",
    labels.length ? labels : ["No Data"],
    values.length ? values : [0],
    "Applications"
  );
}

function renderYouthTrackChart() {
  const counts = countBy(youthData, (row) => row.track);
  const labels = Object.keys(counts);
  const values = Object.values(counts);

  destroyChart(youthTrackChartInstance);
  youthTrackChartInstance = createDoughnutChart(
    "youthTrackChart",
    labels.length ? labels : ["No Data"],
    values.length ? values : [1]
  );
}

function renderArtisanCategoryChart() {
  const counts = countBy(artisanData, (row) => row.category);
  const labels = Object.keys(counts);
  const values = Object.values(counts);

  destroyChart(artisanCategoryChartInstance);
  artisanCategoryChartInstance = createBarChart(
    "artisanCategoryChart",
    labels.length ? labels : ["No Data"],
    values.length ? values : [0],
    "Registrations"
  );
}

function renderPartnerInterestChart() {
  const counts = countBy(partnerData, (row) => row.interest);
  const labels = Object.keys(counts);
  const values = Object.values(counts);

  destroyChart(partnerInterestChartInstance);
  partnerInterestChartInstance = createDoughnutChart(
    "partnerInterestChart",
    labels.length ? labels : ["No Data"],
    values.length ? values : [1]
  );
}

function renderStatusDistributionChart() {
  const allRecords = [...youthData, ...artisanData, ...partnerData];
  const counts = countBy(allRecords, (row) => row.status);
  const labels = Object.keys(counts);
  const values = Object.values(counts);

  destroyChart(statusDistributionChartInstance);
  statusDistributionChartInstance = createDoughnutChart(
    "statusDistributionChart",
    labels.length ? labels : ["No Data"],
    values.length ? values : [1]
  );
}

function renderPipelineConversionChart() {
  const labels = ["Youth", "Artisans", "Partners"];

  const approvedValues = [
    youthData.filter((row) => row.status === "approved").length,
    artisanData.filter((row) => row.status === "approved").length,
    partnerData.filter((row) => row.status === "approved").length,
  ];

  const nonApprovedValues = [
    youthData.length - approvedValues[0],
    artisanData.length - approvedValues[1],
    partnerData.length - approvedValues[2],
  ];

  destroyChart(pipelineConversionChartInstance);
  pipelineConversionChartInstance = createStackedBarChart(
    "pipelineConversionChart",
    labels,
    approvedValues,
    nonApprovedValues
  );
}

/* ======================
SEARCH + FILTERS
====================== */

document.getElementById("searchYouth").addEventListener("input", function () {
  renderYouth(getFilteredYouth());
});

document.getElementById("searchArtisan").addEventListener("input", function () {
  renderArtisans(getFilteredArtisans());
});

document.getElementById("searchPartner").addEventListener("input", function () {
  renderPartners(getFilteredPartners());
});

const statusFilterYouth = document.getElementById("statusFilterYouth");
if (statusFilterYouth) {
  statusFilterYouth.addEventListener("change", function () {
    renderYouth(getFilteredYouth());
  });
}

const statusFilterArtisan = document.getElementById("statusFilterArtisan");
if (statusFilterArtisan) {
  statusFilterArtisan.addEventListener("change", function () {
    renderArtisans(getFilteredArtisans());
  });
}

const statusFilterPartner = document.getElementById("statusFilterPartner");
if (statusFilterPartner) {
  statusFilterPartner.addEventListener("change", function () {
    renderPartners(getFilteredPartners());
  });
}

/* ======================
CSV EXPORT
====================== */

function convertToCSV(data) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
}

function exportCSV(data, filename) {
  if (!data.length) return;

  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  window.URL.revokeObjectURL(url);
}

document.getElementById("exportYouthBtn").onclick = () =>
  exportCSV(getFilteredYouth(), "youth_applications.csv");

document.getElementById("exportArtisanBtn").onclick = () =>
  exportCSV(getFilteredArtisans(), "artisan_registrations.csv");

document.getElementById("exportPartnerBtn").onclick = () =>
  exportCSV(getFilteredPartners(), "partner_inquiries.csv");

/* ======================
BUTTON ACTIONS
====================== */

const refreshDashboardBtn = document.getElementById("refreshDashboardBtn");
if (refreshDashboardBtn) {
  refreshDashboardBtn.addEventListener("click", async () => {
    await refreshAllData();
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    window.location.href = "admin-login.html";
  });
}

/* ======================
AUTO REFRESH
====================== */

setInterval(() => {
  refreshAllData();
}, 20000);

/* ======================
INITIAL LOAD
====================== */

refreshAllData();