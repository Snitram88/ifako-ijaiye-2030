const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
SECTION: DATABASE CONNECTION
========================= */

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((error) => {
  if (error) {
    console.error("MySQL connection failed:", error);
    return;
  }
  console.log("Connected to MySQL database");
});

/* =========================
SECTION: EMAIL CONFIG
========================= */

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

async function sendNotificationEmail(subject, html) {
  await transporter.sendMail({
    from: `"Ifako-Ijaiye 2030 Accelerator" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject,
    html,
  });
}

async function sendDirectEmail(to, subject, html) {
  if (!to) return;

  await transporter.sendMail({
    from: `"Ifako-Ijaiye 2030 Accelerator" <${process.env.EMAIL_USER}>`,
    to,
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
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
    ],
    async (error) => {
      if (error) {
        console.error("Youth insert error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to save youth application.",
        });
      }

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
    }
  );
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
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
    ],
    async (error) => {
      if (error) {
        console.error("Artisan insert error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to save artisan registration.",
        });
      }

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
    }
  );
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
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
    ],
    async (error) => {
      if (error) {
        console.error("Partner insert error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to save partnership inquiry.",
        });
      }

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
    }
  );
});

/* =========================
SECTION: PROTECTED ADMIN DATA ROUTES
========================= */

app.get("/api/admin/youth", verifyAdmin, (req, res) => {
  const sql = "SELECT * FROM youth_applications ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Admin youth fetch error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch youth data.",
      });
    }

    return res.json(results);
  });
});

app.get("/api/admin/artisans", verifyAdmin, (req, res) => {
  const sql = "SELECT * FROM artisan_registrations ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Admin artisan fetch error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch artisan data.",
      });
    }

    return res.json(results);
  });
});

app.get("/api/admin/partners", verifyAdmin, (req, res) => {
  const sql = "SELECT * FROM partner_inquiries ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Admin partner fetch error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch partner data.",
      });
    }

    return res.json(results);
  });
});

/* =========================
SECTION: STATUS UPDATE ROUTE
========================= */

app.put("/api/admin/:type/:id/status", verifyAdmin, (req, res) => {
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

  const fetchSql = `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`;

  db.query(fetchSql, [id], (fetchError, records) => {
    if (fetchError) {
      console.error("Status prefetch error:", fetchError);
      return res.status(500).json({
        success: false,
        message: "Failed to load record before update.",
      });
    }

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }

    const record = records[0];
    const previousStatus = record.status;

    const updateSql = `UPDATE ${tableName} SET status = ? WHERE id = ?`;

    db.query(updateSql, [status, id], async (updateError) => {
      if (updateError) {
        console.error("Status update error:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update status.",
        });
      }

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
    });
  });
});

/* =========================
SECTION: NOTES UPDATE ROUTE
========================= */

app.put("/api/admin/:type/:id/notes", verifyAdmin, (req, res) => {
  const { type, id } = req.params;
  const { notes } = req.body;

  const tableName = getAdminTableName(type);

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin data type.",
    });
  }

  const sql = `UPDATE ${tableName} SET notes = ? WHERE id = ?`;

  db.query(sql, [notes, id], (error) => {
    if (error) {
      console.error("Notes update error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update notes.",
      });
    }

    return res.json({
      success: true,
      message: "Notes updated successfully.",
    });
  });
});

/* =========================
SECTION: ASSIGNED ADMIN UPDATE ROUTE
========================= */

app.put("/api/admin/:type/:id/assign", verifyAdmin, (req, res) => {
  const { type, id } = req.params;
  const { admin } = req.body;

  const tableName = getAdminTableName(type);

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin data type.",
    });
  }

  const sql = `UPDATE ${tableName} SET assigned_admin = ? WHERE id = ?`;

  db.query(sql, [admin, id], (error) => {
    if (error) {
      console.error("Assign admin error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to assign admin.",
      });
    }

    return res.json({
      success: true,
      message: "Assigned admin updated successfully.",
    });
  });
});

/* =========================
SECTION: PUBLIC IMPACT API
========================= */

app.get("/api/public/impact", (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM youth_applications) AS youth_total,
      (SELECT COUNT(*) FROM youth_applications WHERE status='approved') AS youth_approved,

      (SELECT COUNT(*) FROM artisan_registrations) AS artisan_total,
      (SELECT COUNT(*) FROM artisan_registrations WHERE status='approved') AS artisan_approved,

      (SELECT COUNT(*) FROM partner_inquiries) AS partner_total,
      (SELECT COUNT(*) FROM partner_inquiries WHERE status='approved') AS partner_approved
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Public impact API error:", err);
      return res.status(500).json({ success: false });
    }

    const r = result[0];

    const total =
      r.youth_total +
      r.artisan_total +
      r.partner_total;

    const approved =
      r.youth_approved +
      r.artisan_approved +
      r.partner_approved;

    const sdg4 = r.youth_approved;
    const sdg8 = r.artisan_total;
    const sdg9 = r.youth_total;
    const jobs = r.artisan_total * 2;

    return res.json({
      success: true,
      impact: {
        youth_total: r.youth_total,
        youth_approved: r.youth_approved,

        artisan_total: r.artisan_total,
        artisan_approved: r.artisan_approved,

        partner_total: r.partner_total,
        partner_approved: r.partner_approved,

        total,
        approved,

        sdg4,
        sdg8,
        sdg9,
        jobs,
      },
    });
  });
});

/* =========================
SECTION: SERVER START
========================= */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});