/* ======================
API BASE URL
====================== */

const API_BASE = "https://ifako-ijaiye-2030.onrender.com";

/* ======================
CHART INSTANCES
====================== */

let growthChart = null;
let approvalChart = null;

/* ======================
LOAD DASHBOARD
====================== */

async function loadDashboard() {
  try {
    const res = await fetch(API_BASE + "/api/public/impact");
    const data = await res.json();

    if (!data.success || !data.impact) {
      throw new Error("Invalid impact API response");
    }

    const impact = data.impact;

    const youthEl = document.getElementById("youthStat");
    const artisanEl = document.getElementById("artisanStat");
    const partnerEl = document.getElementById("partnerStat");
    const approvalEl = document.getElementById("approvalRate");

    if (youthEl) youthEl.textContent = impact.youth_total ?? 0;
    if (artisanEl) artisanEl.textContent = impact.artisan_total ?? 0;
    if (partnerEl) partnerEl.textContent = impact.partner_total ?? 0;

    const rate = impact.total
      ? Math.round((impact.approved / impact.total) * 100)
      : 0;

    if (approvalEl) approvalEl.textContent = rate + "%";

    const sdg4El = document.getElementById("sdg4");
    const sdg8El = document.getElementById("sdg8");
    const sdg9El = document.getElementById("sdg9");
    const jobsEl = document.getElementById("jobs");

    if (sdg4El) sdg4El.textContent = impact.sdg4 ?? 0;
    if (sdg8El) sdg8El.textContent = impact.sdg8 ?? 0;
    if (sdg9El) sdg9El.textContent = impact.sdg9 ?? 0;
    if (jobsEl) jobsEl.textContent = impact.jobs ?? 0;

    createCharts(impact);
  } catch (error) {
    console.error("Impact dashboard error:", error);
  }
}

/* ======================
CREATE CHARTS
====================== */

function createCharts(impact) {
  const growthCanvas = document.getElementById("growthChart");
  const approvalCanvas = document.getElementById("approvalChart");

  if (!growthCanvas || !approvalCanvas) return;

  if (growthChart) growthChart.destroy();
  if (approvalChart) approvalChart.destroy();

  growthChart = new Chart(growthCanvas, {
    type: "bar",
    data: {
      labels: ["Youth", "Artisans", "Partners"],
      datasets: [
        {
          label: "Approved",
          data: [
            impact.youth_approved || 0,
            impact.artisan_approved || 0,
            impact.partner_approved || 0,
          ],
          backgroundColor: "#19c37d",
        },
        {
          label: "Pending",
          data: [
            (impact.youth_total || 0) - (impact.youth_approved || 0),
            (impact.artisan_total || 0) - (impact.artisan_approved || 0),
            (impact.partner_total || 0) - (impact.partner_approved || 0),
          ],
          backgroundColor: "#64748b",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true },
      },
    },
  });

  approvalChart = new Chart(approvalCanvas, {
    type: "doughnut",
    data: {
      labels: ["Youth", "Artisans", "Partners"],
      datasets: [
        {
          data: [
            impact.youth_total || 0,
            impact.artisan_total || 0,
            impact.partner_total || 0,
          ],
          backgroundColor: ["#19c37d", "#38bdf8", "#f59e0b"],
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

/* ======================
INITIAL LOAD
====================== */

loadDashboard();
setInterval(loadDashboard, 20000);