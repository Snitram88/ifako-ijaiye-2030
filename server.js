const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
SECTION: DATABASE CONNECTION
========================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool
  .connect()
  .then((client) => {
    console.log("Connected to PostgreSQL database");
    client.release();
  })
  .catch((error) => {
    console.error("PostgreSQL connection failed:", error);
  });

/* =========================
SECTION: EMAIL CONFIG (RESEND)
========================= */

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
SECTION: HELPERS
========================= */

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
ADMIN NOTIFICATION EMAIL
========================= */

async function sendNotificationEmail(subject, html) {
  await resend.emails.send({
    from: "Ifako-Ijaiye 2030 <onboarding@resend.dev>",
    to: [process.env.EMAIL_TO],
    subject,
    html,
  });
}

/* =========================
DIRECT EMAIL TO APPLICANT
========================= */

async function sendDirectEmail(to, subject, html) {
  if (!to) return;

  await resend.emails.send({
    from: "Ifako-Ijaiye 2030 <onboarding@resend.dev>",
    to: [to],
    subject,
    html,
  });
}

const ALLOWED_STATUSES = ["new", "reviewed", "contacted", "approved", "rejected"];

function getAdminTableName(type) {
  const tableMap = {
    youth: "youth_applications",
    artisans: "artisan_registrations",
    partners: "partner_inquiries",
  };

  return tableMap[type] || null;
}

function getAdminEmailColumn(type) {
  const emailMap = {
    youth: "email",
    artisans: "email",
    partners: "email",
  };

  return emailMap[type] || null;
}

function getAdminNameColumn(type) {
  const nameMap = {
    youth: "full_name",
    artisans: "contact_name",
    partners: "full_name",
  };

  return nameMap[type] || null;
}

/* =========================
SECTION: AUTH MIDDLEWARE
========================= */

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }

    req.user = user;
    next();
  });
}

/* =========================
SECTION: ROOT ROUTE
========================= */

app.get("/", (_req, res) => {
  res.send("Ifako-Ijaiye 2030 backend is working!");
});

/* =========================
SECTION: ADMIN LOGIN
========================= */

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { admin: true, email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      token,
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });
});

/* =========================
SECTION: YOUTH APPLICATION
========================= */

app.post("/api/youth", async (req, res) => {
  const {
    fullName,
    email,
    phone,
    track,
    gender,
    age,
    employmentStatus,
    locationDetail,
    sustainabilityInterest,
    goals,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !phone ||
    !track ||
    !gender ||
    !age ||
    !employmentStatus ||
    !locationDetail ||
    !sustainabilityInterest ||
    !goals
  ) {
    return res.status(400).json({
      success: false,
      message: "All youth application fields are required.",
    });
  }

  const sql = `
    INSERT INTO youth_applications
    (
      full_name,
      email,
      phone,
      track,
      gender,
      age,
      employment_status,
      location_detail,
      sustainability_interest,
      goals
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  try {

  /* =========================
  DUPLICATE CHECK
  ========================= */

  const existing = await pool.query(
    "SELECT id FROM youth_applications WHERE email=$1 LIMIT 1",
    [email]
  );

  if (existing.rows.length > 0) {
    return res.json({
      success: false,
      message: "You have already submitted an application.",
    });
  }

  /* =========================
  INSERT APPLICATION
  ========================= */

  await pool.query(sql, [
    fullName,
    email,
    phone,
    track,
    gender,
    age,
    employmentStatus,
    locationDetail,
    sustainabilityInterest,
    goals,
  ]);

    try {
      await sendNotificationEmail(
        "New Youth Application - Ifako-Ijaiye 2030",
        `
          <h2>New Youth Application</h2>
          <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Track:</strong> ${escapeHtml(track)}</p>
          <p><strong>Gender:</strong> ${escapeHtml(gender)}</p>
          <p><strong>Age:</strong> ${escapeHtml(age)}</p>
          <p><strong>Employment Status:</strong> ${escapeHtml(employmentStatus)}</p>
          <p><strong>Location Detail:</strong> ${escapeHtml(locationDetail)}</p>
          <p><strong>Sustainability Interest:</strong> ${escapeHtml(sustainabilityInterest)}</p>
          <p><strong>Goals:</strong><br>${escapeHtml(goals)}</p>
        `
      );

      return res.json({
        success: true,
        message: "Youth application submitted successfully.",
      });
    } catch (mailError) {
      console.error("Youth email error:", mailError);

      return res.json({
        success: true,
        message: "Application saved, but email notification failed.",
      });
    }
  } catch (error) {
    console.error("Youth insert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save youth application.",
    });
  }
});

/* =========================
SECTION: ARTISAN REGISTRATION
========================= */

app.post("/api/artisan", async (req, res) => {
  const {
    businessName,
    contactName,
    email,
    phone,
    category,
    gender,
    age,
    employmentStatus,
    locationDetail,
    sustainabilityInterest,
    description,
  } = req.body;

  if (
    !businessName ||
    !contactName ||
    !email ||
    !phone ||
    !category ||
    !gender ||
    !age ||
    !employmentStatus ||
    !locationDetail ||
    !sustainabilityInterest ||
    !description
  ) {
    return res.status(400).json({
      success: false,
      message: "All artisan registration fields are required.",
    });
  }

  const sql = `
    INSERT INTO artisan_registrations
    (
      business_name,
      contact_name,
      email,
      phone,
      category,
      gender,
      age,
      employment_status,
      location_detail,
      sustainability_interest,
      description
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;

  try {

  const existing = await pool.query(
    "SELECT id FROM artisan_registrations WHERE email=$1 LIMIT 1",
    [email]
  );

  if (existing.rows.length > 0) {
    return res.json({
      success: false,
      message: "This email already submitted an artisan registration.",
    });
  }

  await pool.query(sql, [
    businessName,
    contactName,
    email,
    phone,
    category,
    gender,
    age,
    employmentStatus,
    locationDetail,
    sustainabilityInterest,
    description,
  ]);

    try {
      await sendNotificationEmail(
        "New Artisan Registration - Ifako-Ijaiye 2030",
        `
          <h2>New Artisan Registration</h2>
          <p><strong>Business:</strong> ${escapeHtml(businessName)}</p>
          <p><strong>Contact:</strong> ${escapeHtml(contactName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Category:</strong> ${escapeHtml(category)}</p>
          <p><strong>Gender:</strong> ${escapeHtml(gender)}</p>
          <p><strong>Age:</strong> ${escapeHtml(age)}</p>
          <p><strong>Employment Status:</strong> ${escapeHtml(employmentStatus)}</p>
          <p><strong>Location Detail:</strong> ${escapeHtml(locationDetail)}</p>
          <p><strong>Sustainability Interest:</strong> ${escapeHtml(sustainabilityInterest)}</p>
          <p><strong>Description:</strong><br>${escapeHtml(description)}</p>
        `
      );

      return res.json({
        success: true,
        message: "Artisan registration submitted successfully.",
      });
    } catch (mailError) {
      console.error("Artisan email error:", mailError);

      return res.json({
        success: true,
        message: "Registration saved but email failed",
      });
    }
  } catch (error) {
    console.error("Artisan insert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save artisan registration.",
    });
  }
});

/* =========================
SECTION: PARTNERSHIP INQUIRY
========================= */

app.post("/api/partner", async (req, res) => {
  const {
    fullName,
    organization,
    email,
    phone,
    interest,
    gender,
    age,
    employmentStatus,
    locationDetail,
    sustainabilityInterest,
    message,
  } = req.body;

  if (
    !fullName ||
    !organization ||
    !email ||
    !phone ||
    !interest ||
    !gender ||
    !age ||
    !employmentStatus ||
    !locationDetail ||
    !sustainabilityInterest ||
    !message
  ) {
    return res.status(400).json({
      success: false,
      message: "All partnership inquiry fields are required.",
    });
  }

  const sql = `
    INSERT INTO partner_inquiries
    (
      full_name,
      organization,
      email,
      phone,
      interest,
      gender,
      age,
      employment_status,
      location_detail,
      sustainability_interest,
      message
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;

  try {

  const existing = await pool.query(
    "SELECT id FROM partner_inquiries WHERE email=$1 LIMIT 1",
    [email]
  );

  if (existing.rows.length > 0) {
    return res.json({
      success: false,
      message: "You already submitted a partnership request.",
    });
  }

  await pool.query(sql, [
    fullName,
    organization,
    email,
    phone,
    interest,
    gender,
    age,
    employmentStatus,
    locationDetail,
    sustainabilityInterest,
    message,
  ]);

    try {
      await sendNotificationEmail(
        "New Partnership Inquiry - Ifako-Ijaiye 2030",
        `
          <h2>New Partnership Inquiry</h2>
          <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Organization:</strong> ${escapeHtml(organization)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Interest:</strong> ${escapeHtml(interest)}</p>
          <p><strong>Gender:</strong> ${escapeHtml(gender)}</p>
          <p><strong>Age:</strong> ${escapeHtml(age)}</p>
          <p><strong>Employment Status:</strong> ${escapeHtml(employmentStatus)}</p>
          <p><strong>Location Detail:</strong> ${escapeHtml(locationDetail)}</p>
          <p><strong>Sustainability Interest:</strong> ${escapeHtml(sustainabilityInterest)}</p>
          <p><strong>Message:</strong><br>${escapeHtml(message)}</p>
        `
      );

      return res.json({
        success: true,
        message: "Partnership inquiry submitted successfully.",
      });
    } catch (mailError) {
      console.error("Partner email error:", mailError);

      return res.json({
        success: true,
        message: "Saved but email failed",
      });
    }
  } catch (error) {
    console.error("Partner insert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save partnership inquiry.",
    });
  }
});

/* =========================
SECTION: PROTECTED ADMIN DATA ROUTES
========================= */

app.get("/api/admin/youth", verifyAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM youth_applications ORDER BY created_at DESC"
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Admin youth fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch youth data.",
    });
  }
});

app.get("/api/admin/artisans", verifyAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM artisan_registrations ORDER BY created_at DESC"
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Admin artisan fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artisan data.",
    });
  }
});

app.get("/api/admin/partners", verifyAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM partner_inquiries ORDER BY created_at DESC"
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Admin partner fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch partner data.",
    });
  }
});

/* =========================
SECTION: STATUS UPDATE ROUTE
========================= */

app.put("/api/admin/:type/:id/status", verifyAdmin, async (req, res) => {
  const { type, id } = req.params;
  const { status } = req.body;

  const tableName = getAdminTableName(type);
  const emailColumn = getAdminEmailColumn(type);
  const nameColumn = getAdminNameColumn(type);

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin data type.",
    });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value.",
    });
  }

  try {
    const recordResult = await pool.query(
      `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!recordResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }

    const record = recordResult.rows[0];
    const previousStatus = record.status;

    await pool.query(
      `UPDATE ${tableName} SET status = $1 WHERE id = $2`,
      [status, id]
    );

    try {
      const recipientEmail = emailColumn ? record[emailColumn] : null;
      const recipientName = nameColumn ? record[nameColumn] : "Applicant";

      if (recipientEmail && previousStatus !== status) {
        if (status === "approved") {
          let subject = "Application Approved - Ifako-Ijaiye 2030 Accelerator";
          let html = `
            <h2>Congratulations, ${escapeHtml(recipientName)}!</h2>
            <p>Your submission to the Ifako-Ijaiye 2030 Accelerator has been <strong>approved</strong>.</p>
            <p>Our team will contact you with the next steps shortly.</p>
            <p>Thank you for being part of this pipeline for growth and opportunity.</p>
          `;

          if (type === "partners") {
            subject = "Partnership Inquiry Approved - Ifako-Ijaiye 2030 Accelerator";
            html = `
              <h2>Hello ${escapeHtml(recipientName)},</h2>
              <p>Your partnership inquiry has been <strong>approved</strong>.</p>
              <p>Our team will reach out to discuss the next phase of engagement.</p>
              <p>Thank you for supporting localized SDG impact delivery.</p>
            `;
          }

          await sendDirectEmail(recipientEmail, subject, html);
        }

        if (status === "contacted") {
          let subject = "We Have Reached Your Submission - Ifako-Ijaiye 2030 Accelerator";
          let html = `
            <h2>Hello ${escapeHtml(recipientName)},</h2>
            <p>Your submission has been reviewed and our team has now marked it as <strong>contacted</strong>.</p>
            <p>Please monitor your email and phone for follow-up communication.</p>
          `;

          if (type === "partners") {
            subject = "Your Partnership Inquiry Is Being Processed";
            html = `
              <h2>Hello ${escapeHtml(recipientName)},</h2>
              <p>Your partnership inquiry is now being actively processed by our team.</p>
              <p>We will follow up with you shortly.</p>
            `;
          }

          await sendDirectEmail(recipientEmail, subject, html);
        }
      }

      return res.json({
        success: true,
        message: "Status updated successfully.",
      });
    } catch (mailError) {
      console.error("Automated status email error:", mailError);

      return res.json({
        success: true,
        message: "Status updated, but automated email failed.",
      });
    }
  } catch (error) {
    console.error("Status update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status.",
    });
  }
});

/* =========================
SECTION: NOTES UPDATE ROUTE
========================= */

app.put("/api/admin/:type/:id/notes", verifyAdmin, async (req, res) => {
  const { type, id } = req.params;
  const { notes } = req.body;

  const tableName = getAdminTableName(type);

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin data type.",
    });
  }

  try {
    await pool.query(
      `UPDATE ${tableName} SET notes = $1 WHERE id = $2`,
      [notes, id]
    );

    return res.json({
      success: true,
      message: "Notes updated successfully.",
    });
  } catch (error) {
    console.error("Notes update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notes.",
    });
  }
});

/* =========================
SECTION: ASSIGNED ADMIN UPDATE ROUTE
========================= */

app.put("/api/admin/:type/:id/assign", verifyAdmin, async (req, res) => {
  const { type, id } = req.params;
  const { admin } = req.body;

  const tableName = getAdminTableName(type);

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin data type.",
    });
  }

  try {
    await pool.query(
      `UPDATE ${tableName} SET assigned_admin = $1 WHERE id = $2`,
      [admin, id]
    );

    return res.json({
      success: true,
      message: "Assigned admin updated successfully.",
    });
  } catch (error) {
    console.error("Assign admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign admin.",
    });
  }
});

/* =========================
SECTION: PUBLIC IMPACT API
========================= */

app.get("/api/public/impact", async (_req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM youth_applications) AS youth_total,
      (SELECT COUNT(*) FROM youth_applications WHERE status = 'approved') AS youth_approved,
      (SELECT COUNT(*) FROM artisan_registrations) AS artisan_total,
      (SELECT COUNT(*) FROM artisan_registrations WHERE status = 'approved') AS artisan_approved,
      (SELECT COUNT(*) FROM partner_inquiries) AS partner_total,
      (SELECT COUNT(*) FROM partner_inquiries WHERE status = 'approved') AS partner_approved
  `;

  try {
    const result = await pool.query(sql);
    const r = result.rows[0];

    const youthTotal = Number(r.youth_total || 0);
    const youthApproved = Number(r.youth_approved || 0);
    const artisanTotal = Number(r.artisan_total || 0);
    const artisanApproved = Number(r.artisan_approved || 0);
    const partnerTotal = Number(r.partner_total || 0);
    const partnerApproved = Number(r.partner_approved || 0);

    const total = youthTotal + artisanTotal + partnerTotal;
    const approved = youthApproved + artisanApproved + partnerApproved;

    const sdg4 = youthApproved;
    const sdg8 = artisanTotal;
    const sdg9 = youthTotal;
    const jobs = artisanTotal * 2;

    return res.json({
      success: true,
      impact: {
        youth_total: youthTotal,
        youth_approved: youthApproved,
        artisan_total: artisanTotal,
        artisan_approved: artisanApproved,
        partner_total: partnerTotal,
        partner_approved: partnerApproved,
        total,
        approved,
        sdg4,
        sdg8,
        sdg9,
        jobs,
      },
    });
  } catch (err) {
    console.error("Public impact API error:", err);
    return res.status(500).json({ success: false });
  }
});

/* =========================
SECTION: SERVER START
========================= */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});