document.addEventListener("DOMContentLoaded", function () {
  setupMobileNav();
  setupTabs();
  setupRevealFallback();
  setupCountersAndBars();
  setupBackendForms();
  highlightActiveNav();
});

/* =========================
SECTION: API BASE URL
========================= */

const API_BASE = "https://ifako-ijaiye-2030.onrender.com";

function setupMobileNav() {
  const mobileToggle = document.getElementById("mobileToggle");
  const navLinks = document.getElementById("navLinks");

  if (!mobileToggle || !navLinks) return;

  mobileToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
  });

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("show");
    });
  });
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  if (!tabButtons.length || !tabContents.length) return;

  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const target = button.getAttribute("data-tab");

      tabButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      tabContents.forEach(function (content) {
        content.classList.remove("active");
      });

      button.classList.add("active");

      const activeTab = document.getElementById("tab-" + target);
      if (activeTab) {
        activeTab.classList.add("active");
      }
    });
  });
}

function formatValue(value, format) {
  if (format === "currency") {
    return "₦" + Number(value).toLocaleString();
  }

  if (format === "percent") {
    return value + "%";
  }

  if (Number(value) >= 1000) {
    return Number(value).toLocaleString();
  }

  return value;
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.counter || "0");
  const format = el.dataset.format || "number";
  const duration = 1600;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;

    let displayValue;

    if (format === "currency") {
      displayValue = formatValue(Math.round(current), format);
    } else if (format === "percent") {
      displayValue = formatValue(
        (Math.round(current * 10) / 10).toString().replace(/\.0$/, ""),
        format
      );
    } else {
      displayValue = formatValue(Math.round(current), format);
    }

    el.textContent = displayValue;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (format === "currency") {
        el.textContent = formatValue(Math.round(target), format);
      } else if (format === "percent") {
        el.textContent = formatValue(target.toString().replace(/\.0$/, ""), format);
      } else {
        el.textContent = formatValue(target, format);
      }
    }
  }

  requestAnimationFrame(update);
}

function setupRevealFallback() {
  const revealElements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach(function (el) {
      el.classList.add("visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.1 }
  );

  revealElements.forEach(function (el) {
    observer.observe(el);
  });
}

function setupCountersAndBars() {
  const sections = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    runAnimations(document);
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        runAnimations(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
}

function runAnimations(scope) {
  const counters = scope.querySelectorAll("[data-counter]");
  const bars = scope.querySelectorAll(".bar span");
  const fills = scope.querySelectorAll(".bar-fill");

  counters.forEach(function (counter) {
    if (!counter.dataset.started) {
      counter.dataset.started = "true";
      animateCounter(counter);
    }
  });

  bars.forEach(function (bar) {
    const width = bar.dataset.width;
    if (!bar.dataset.started && width) {
      bar.dataset.started = "true";
      setTimeout(function () {
        bar.style.width = width + "%";
      }, 180);
    }
  });

  fills.forEach(function (fill) {
    const height = fill.dataset.height;
    if (!fill.dataset.started && height) {
      fill.dataset.started = "true";
      setTimeout(function () {
        fill.style.height = height + "%";
      }, 220);
    }
  });
}

function highlightActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-links a");

  navLinks.forEach(function (link) {
    const href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function showNotice(form, type, message) {
  const notice = form.querySelector(".notice");
  if (!notice) return;

  notice.className = "notice " + type;
  notice.textContent = message;
}

function validateRequired(form) {
  const requiredFields = form.querySelectorAll("[data-required]");
  let valid = true;

  requiredFields.forEach(function (field) {
    const value = field.value.trim();

    if (!value) {
      valid = false;
      field.style.borderColor = "rgba(239, 68, 68, 0.5)";
    } else {
      field.style.borderColor = "rgba(255,255,255,0.12)";
    }
  });

  return valid;
}

async function postFormData(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  return result;
}

function setupBackendForms() {
  const youthForm = document.getElementById("youthForm");
  const artisanForm = document.getElementById("artisanForm");
  const partnerForm = document.getElementById("partnerForm");

  if (youthForm) {
    youthForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validateRequired(youthForm)) {
        showNotice(youthForm, "error", "Please complete all required fields.");
        return;
      }

      const payload = {
        fullName: document.getElementById("youth-name").value.trim(),
        email: document.getElementById("youth-email").value.trim(),
        phone: document.getElementById("youth-phone").value.trim(),
        track: document.getElementById("track").value.trim(),
        goals: document.getElementById("youth-message").value.trim(),
      };

      try {
        const result = await postFormData(API_BASE + "/api/youth", payload);

        if (result.success) {
          showNotice(youthForm, "success", result.message);
          youthForm.reset();
        } else {
          showNotice(youthForm, "error", result.message || "Submission failed.");
        }
      } catch (error) {
        console.error(error);
        showNotice(youthForm, "error", "Could not connect to the server.");
      }
    });
  }

  if (artisanForm) {
    artisanForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validateRequired(artisanForm)) {
        showNotice(artisanForm, "error", "Please complete all required fields.");
        return;
      }

      const payload = {
        businessName: document.getElementById("biz-name").value.trim(),
        contactName: document.getElementById("artisan-name").value.trim(),
        category: document.getElementById("category").value.trim(),
        location: document.getElementById("location").value.trim(),
        description: document.getElementById("artisan-message").value.trim(),
      };

      try {
        const result = await postFormData(API_BASE + "/api/artisan", payload);

        if (result.success) {
          showNotice(artisanForm, "success", result.message);
          artisanForm.reset();
        } else {
          showNotice(artisanForm, "error", result.message || "Submission failed.");
        }
      } catch (error) {
        console.error(error);
        showNotice(artisanForm, "error", "Could not connect to the server.");
      }
    });
  }

  if (partnerForm) {
    partnerForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validateRequired(partnerForm)) {
        showNotice(partnerForm, "error", "Please complete all required fields.");
        return;
      }

      const payload = {
        fullName: document.getElementById("partner-name").value.trim(),
        organization: document.getElementById("org").value.trim(),
        email: document.getElementById("corp-email").value.trim(),
        interest: document.getElementById("interest").value.trim(),
        message: document.getElementById("partner-message").value.trim(),
      };

      try {
        const result = await postFormData(API_BASE + "/api/partner", payload);

        if (result.success) {
          showNotice(partnerForm, "success", result.message);
          partnerForm.reset();
        } else {
          showNotice(partnerForm, "error", result.message || "Submission failed.");
        }
      } catch (error) {
        console.error(error);
        showNotice(partnerForm, "error", "Could not connect to the server.");
      }
    });
  }
}document.addEventListener("DOMContentLoaded", function () {
  /* =========================
  SECTION: PAGE INITIALIZATION
  ========================= */
  setupMobileNav();
  setupTabs();
  setupRevealFallback();
  setupCountersAndBars();
  setupBackendForms();
  highlightActiveNav();
});

function setupMobileNav() {
  /* =========================
  SECTION: MOBILE NAVIGATION
  ========================= */
  const mobileToggle = document.getElementById("mobileToggle");
  const navLinks = document.getElementById("navLinks");

  if (!mobileToggle || !navLinks) return;

  mobileToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
  });

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("show");
    });
  });
}

function setupTabs() {
  /* =========================
  SECTION: TAB SWITCHING
  ========================= */
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  if (!tabButtons.length || !tabContents.length) return;

  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const target = button.getAttribute("data-tab");

      tabButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      tabContents.forEach(function (content) {
        content.classList.remove("active");
      });

      button.classList.add("active");

      const activeTab = document.getElementById("tab-" + target);
      if (activeTab) {
        activeTab.classList.add("active");
      }
    });
  });
}

function formatValue(value, format) {
  /* =========================
  SECTION: COUNTER FORMATTING
  ========================= */
  if (format === "currency") {
    return "₦" + Number(value).toLocaleString();
  }

  if (format === "percent") {
    return value + "%";
  }

  if (Number(value) >= 1000) {
    return Number(value).toLocaleString();
  }

  return value;
}

function animateCounter(el) {
  /* =========================
  SECTION: COUNTER ANIMATION
  ========================= */
  const target = parseFloat(el.dataset.counter || "0");
  const format = el.dataset.format || "number";
  const duration = 1600;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;

    let displayValue;

    if (format === "currency") {
      displayValue = formatValue(Math.round(current), format);
    } else if (format === "percent") {
      displayValue = formatValue(
        (Math.round(current * 10) / 10).toString().replace(/\.0$/, ""),
        format
      );
    } else {
      displayValue = formatValue(Math.round(current), format);
    }

    el.textContent = displayValue;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (format === "currency") {
        el.textContent = formatValue(Math.round(target), format);
      } else if (format === "percent") {
        el.textContent = formatValue(target.toString().replace(/\.0$/, ""), format);
      } else {
        el.textContent = formatValue(target, format);
      }
    }
  }

  requestAnimationFrame(update);
}

function setupRevealFallback() {
  /* =========================
  SECTION: SCROLL REVEAL
  ========================= */
  const revealElements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach(function (el) {
      el.classList.add("visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.1 }
  );

  revealElements.forEach(function (el) {
    observer.observe(el);
  });
}

function setupCountersAndBars() {
  /* =========================
  SECTION: KPI ANIMATIONS
  ========================= */
  const sections = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    runAnimations(document);
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        runAnimations(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
}

function runAnimations(scope) {
  /* =========================
  SECTION: BAR + COUNTER RUNNER
  ========================= */
  const counters = scope.querySelectorAll("[data-counter]");
  const bars = scope.querySelectorAll(".bar span");
  const fills = scope.querySelectorAll(".bar-fill");

  counters.forEach(function (counter) {
    if (!counter.dataset.started) {
      counter.dataset.started = "true";
      animateCounter(counter);
    }
  });

  bars.forEach(function (bar) {
    const width = bar.dataset.width;
    if (!bar.dataset.started && width) {
      bar.dataset.started = "true";
      setTimeout(function () {
        bar.style.width = width + "%";
      }, 180);
    }
  });

  fills.forEach(function (fill) {
    const height = fill.dataset.height;
    if (!fill.dataset.started && height) {
      fill.dataset.started = "true";
      setTimeout(function () {
        fill.style.height = height + "%";
      }, 220);
    }
  });
}

function highlightActiveNav() {
  /* =========================
  SECTION: ACTIVE NAV LINK
  ========================= */
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-links a");

  navLinks.forEach(function (link) {
    const href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function showNotice(form, type, message) {
  /* =========================
  SECTION: FORM NOTICE FEEDBACK
  ========================= */
  const notice = form.querySelector(".notice");
  if (!notice) return;

  notice.className = "notice " + type;
  notice.textContent = message;
}

function validateRequired(form) {
  /* =========================
  SECTION: FORM VALIDATION
  ========================= */
  const requiredFields = form.querySelectorAll("[data-required]");
  let valid = true;

  requiredFields.forEach(function (field) {
    const value = field.value.trim();

    if (!value) {
      valid = false;
      field.style.borderColor = "rgba(239, 68, 68, 0.5)";
    } else {
      field.style.borderColor = "rgba(255,255,255,0.12)";
    }
  });

  return valid;
}

async function postFormData(url, data) {
  /* =========================
  SECTION: API POST HELPER
  ========================= */
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  return result;
}

function setupBackendForms() {
  /* =========================
  SECTION: FORM SUBMISSION HANDLERS
  ========================= */
  const youthForm = document.getElementById("youthForm");
  const artisanForm = document.getElementById("artisanForm");
  const partnerForm = document.getElementById("partnerForm");

  /* =========================
  SUBSECTION: YOUTH FORM SUBMISSION
  ========================= */
  if (youthForm) {
    youthForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validateRequired(youthForm)) {
        showNotice(youthForm, "error", "Please complete all required fields.");
        return;
      }

      const payload = {
        fullName: document.getElementById("youth-name").value.trim(),
        email: document.getElementById("youth-email").value.trim(),
        phone: document.getElementById("youth-phone").value.trim(),
        track: document.getElementById("track").value.trim(),
        gender: document.getElementById("youth-gender").value.trim(),
        age: document.getElementById("youth-age").value.trim(),
        employmentStatus: document.getElementById("youth-employment-status").value.trim(),
        locationDetail: document.getElementById("youth-location-detail").value.trim(),
        sustainabilityInterest: document.getElementById("youth-sustainability-interest").value.trim(),
        goals: document.getElementById("youth-message").value.trim(),
      };

            try {
        const result = await postFormData(API_BASE + "/api/youth", payload);

        if (result.success) {
          showNotice(youthForm, "success", result.message);
          youthForm.reset();
        } else {
          showNotice(youthForm, "error", result.message || "Submission failed.");
        }
      } catch (error) {
        console.error(error);
        showNotice(youthForm, "error", "Could not connect to the server.");
      }
    });
  }

  /* =========================
  SUBSECTION: ARTISAN FORM SUBMISSION
  ========================= */
  if (artisanForm) {
    artisanForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validateRequired(artisanForm)) {
        showNotice(artisanForm, "error", "Please complete all required fields.");
        return;
      }

      const payload = {
        businessName: document.getElementById("biz-name").value.trim(),
        contactName: document.getElementById("artisan-name").value.trim(),
        email: document.getElementById("artisan-email").value.trim(),
        phone: document.getElementById("artisan-phone").value.trim(),
        category: document.getElementById("category").value.trim(),
        gender: document.getElementById("artisan-gender").value.trim(),
        age: document.getElementById("artisan-age").value.trim(),
        employmentStatus: document.getElementById("artisan-employment-status").value.trim(),
        locationDetail: document.getElementById("artisan-location-detail").value.trim(),
        sustainabilityInterest: document.getElementById("artisan-sustainability-interest").value.trim(),
        description: document.getElementById("artisan-message").value.trim(),
      };

      try {
        const result = await postFormData(API_BASE + "/api/artisan", payload);

        if (result.success) {
          showNotice(artisanForm, "success", result.message);
          artisanForm.reset();
        } else {
          showNotice(artisanForm, "error", result.message || "Submission failed.");
        }
      } catch (error) {
        console.error(error);
        showNotice(artisanForm, "error", "Could not connect to the server.");
      }
    });
  }

  /* =========================
  SUBSECTION: PARTNER FORM SUBMISSION
  ========================= */
  if (partnerForm) {
    partnerForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validateRequired(partnerForm)) {
        showNotice(partnerForm, "error", "Please complete all required fields.");
        return;
      }

      const payload = {
        fullName: document.getElementById("partner-name").value.trim(),
        organization: document.getElementById("org").value.trim(),
        email: document.getElementById("corp-email").value.trim(),
        phone: document.getElementById("partner-phone").value.trim(),
        interest: document.getElementById("interest").value.trim(),
        gender: document.getElementById("partner-gender").value.trim(),
        age: document.getElementById("partner-age").value.trim(),
        employmentStatus: document.getElementById("partner-employment-status").value.trim(),
        locationDetail: document.getElementById("partner-location-detail").value.trim(),
        sustainabilityInterest: document.getElementById("partner-sustainability-interest").value.trim(),
        message: document.getElementById("partner-message").value.trim(),
      };

      try {
        const result = await postFormData(API_BASE + "/api/partner", payload);

        if (result.success) {
          showNotice(partnerForm, "success", result.message);
          partnerForm.reset();
        } else {
          showNotice(partnerForm, "error", result.message || "Submission failed.");
        }
      } catch (error) {
        console.error(error);
        showNotice(partnerForm, "error", "Could not connect to the server.");
      }
    });
  }
}