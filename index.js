import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { createCanvas, Image } from "canvas"
import bcrypt from "bcrypt";
import session from "express-session";
import { createServer } from 'http'; 
import { Server } from 'socket.io';  
import dotenv from 'dotenv';
import connectPgSimple from "connect-pg-simple";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

db.on("error", (err) => {
  console.error("Unexpected database connection error:", err);
});

const PgSession = connectPgSimple(session);

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

const sessionMiddleware = session({
    store: new PgSession({
        pool: db,
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
});

app.use(sessionMiddleware);

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    if (req.session.role !== role) {
      return res.status(403).send("Access denied");
    }

    next();
  };
}

function requireRegistration(role) {
  return (req, res, next) => {
    const userData = req.session.userData;

    if (!userData) {
      return res.redirect("/signup");
    }

    if (userData.role !== role) {
      return res.status(403).send("Access denied");
    }

    next();
  };
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));





app.get("/", async (req, res) => {
  // const result = await db.query('SELECT * FROM review')
  // const items = result.rows;
  // console.log(items)
  // res.render("index.ejs",{items})
  res.render("home.ejs")
});

app.post("/login", async (req, res) => {

  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.userId = user.user_id;
      req.session.role = user.role;

      res.redirect("/" + user.role);
    }else {
      return res.status(401).render("login.ejs", {
          error: "Invalid email or password"
      });
    }
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).send("Error logging in");
  }
});
 
app.post("/register", async (req, res) => {
  const { firstName, lastName, password, email, phone, role } = req.body;
  req.session.userData = { firstName, lastName, password, email, phone, role };

  if (role === "landlord") {
    res.redirect("/landlordInfo");
  } else if (role === "tenant") {
    res.redirect("/tenantInfo");
  } else {
    res.redirect("/lawyerInfo");
  }
  
})

app.post("/tenant-info", requireRegistration("tenant"), async (req, res) => {
  const { address, date_of_birth, national_id_number, employment_status, credit_score } = req.body;
  const { firstName, lastName, password, email, phone, role } = req.session.userData;
  const hashedPassword = bcrypt.hashSync(password, 10);
  

  try {
    const result = await db.query(
      'INSERT INTO users (first_name, last_name, password, email, phone_number, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING user_id',
      [firstName, lastName, hashedPassword, email, phone, role]
    );

    const userId = result.rows[0].user_id;

    await db.query(
      'INSERT INTO tenants (user_id, first_name, last_name, address, date_of_birth, national_id_number, phone_number, email, employment_status, credit_score, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())',
      [userId, firstName, lastName, address, date_of_birth, national_id_number, phone, email, employment_status, credit_score]
    );

   delete req.session.userData;
   res.redirect("/login");
  } catch (err) {
    console.error("Error adding tenant information:", err);
    res.status(500).send("Error adding tenant information");
  }
})

app.post("/landlord-info", requireRegistration("landlord"), async (req, res) => {
  const { company} = req.body;
  const { firstName, lastName, password, email, phone, role } = req.session.userData;
  const hashedPassword = bcrypt.hashSync(password, 10);
  

  try {
    const result = await db.query(
      'INSERT INTO users (first_name, last_name, password, email, phone_number, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING user_id',
      [firstName, lastName, hashedPassword, email, phone, role]
    );

    const userId = result.rows[0].user_id;

    await db.query(
      'INSERT INTO landlords (user_id, company_name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
      [userId, company]
    );

   delete req.session.userData;
   res.redirect("/login");
  } catch (err) {
    console.error("Error adding tenant information:", err);
    res.status(500).send("Error adding tenant information");
  }
})

app.post("/lawyer-info", requireRegistration("lawyer"), async (req, res) => {
  const { licenseNumber, jurisdiction} = req.body;
  const { firstName, lastName, password, email, phone, role } = req.session.userData;
  const hashedPassword = bcrypt.hashSync(password, 10);
  

  try {
    const result = await db.query(
      'INSERT INTO users (first_name, last_name, password, email, phone_number, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING user_id',
      [firstName, lastName, hashedPassword, email, phone, role]
    );

    const userId = result.rows[0].user_id;

    await db.query(
      'INSERT INTO lawyers (user_id, license_number, jurisdiction, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
      [userId, licenseNumber, jurisdiction]
    );

   delete req.session.userData;
   res.redirect("/login");
  } catch (err) {
    console.error("Error adding tenant information:", err);
    res.status(500).send("Error adding tenant information");
  }
})

app.get("/login", (req, res) => {
 
  res.render("login.ejs"); // Render dashboard page
});

app.get("/signup", (req, res) => {
  
  res.render("signup.ejs"); // Render dashboard page
});

app.get("/tenantInfo", requireRegistration("tenant"), (req, res) => {
  res.render("tenantInfo.ejs");
});

app.get("/landlordInfo", requireRegistration("landlord"), (req, res) => {
  res.render("landlordInfo.ejs");
});

app.get("/lawyerInfo", requireRegistration("lawyer"), (req, res) => {
  res.render("lawyerInfo.ejs");
});

app.get("/tenant", requireRole("tenant"), (req, res) => {
  res.render("tenant.ejs");
});
app.get("/landlord", requireRole("landlord"), (req, res) => {
  res.render("landlord.ejs");
});

app.get("/lawyer", requireRole("lawyer"), (req, res) => {
  res.render("lawyer.ejs");
});

app.get("/admin", requireRole("admin"), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                tr.report_id,
                tr.tenant_first_name,
                tr.tenant_last_name,
                tr.property_address,
                tr.payment_history,
                tr.property_condition,
                tr.created_at,
                tr.tenancy_start,
                tr.tenancy_end,
                tr.description,
                tr.would_rent_again,
                tr.status,
                u.first_name AS landlord_first_name,
                u.last_name AS landlord_last_name
             FROM tenant_reports tr
             JOIN users u ON tr.landlord_id = u.user_id
             WHERE tr.status IN ('pending', 'more_info_requested')
             ORDER BY tr.created_at ASC, tr.report_id ASC`
        );

        res.render("admin.ejs", {
            reports: result.rows
        });

    } catch (err) {
        console.error("Error loading pending reports:", err);
        res.status(500).send("Unable to load admin dashboard");
    }
});

app.get("/admin/reports/:id", requireRole("admin"), async (req, res) => {
    const reportId = Number(req.params.id);

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
        return res.status(400).send("Invalid report ID");
    }

    try {
        const result = await db.query(
            `SELECT tr.*, u.first_name AS landlord_first_name,
                    u.last_name AS landlord_last_name,
                    u.email AS landlord_email
             FROM tenant_reports tr
             JOIN users u ON tr.landlord_id = u.user_id
             WHERE tr.report_id = $1`,
            [reportId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send("Report not found");
        }

        const reviewResult = await db.query(
            `SELECT
                rr.action,
                rr.notes,
                rr.created_at,
                u.first_name,
                u.last_name
            FROM report_reviews rr
            JOIN users u ON rr.admin_id = u.user_id
            WHERE rr.report_id = $1
            ORDER BY rr.created_at ASC, rr.review_id ASC`,
            [reportId]
        );
        
        res.render("adminReportDetails.ejs", {
            report: result.rows[0],
            reviews: reviewResult.rows
        });

    } catch (err) {
        console.error("Error loading report details:", err);
        res.status(500).send("Unable to load report");
    }
});

app.post("/admin/reports/:id/review", requireRole("admin"), async (req, res) => {
    const reportId = Number(req.params.id);
    const { action, adminNotes } = req.body;

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
        return res.status(400).send("Invalid report ID");
    }

    const statuses = {
        request_info: "more_info_requested",
        approve: "approved",
        reject: "rejected"
    };

    if (!Object.hasOwn(statuses, action)) {
        return res.status(400).send("Invalid review action");
    }

    if (typeof adminNotes !== "string" || adminNotes.length > 2000) {
        return res.status(400).send("Invalid review notes");
    }

    if (action !== "approve" && !adminNotes.trim()) {
        return res.status(400).send("Review notes are required");
    }

    

    
    let client;

    try {
        client = await db.connect();

        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE tenant_reports
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP
             WHERE report_id = $3
               AND status IN ('pending', 'more_info_requested')
             RETURNING report_id`,
            [statuses[action], req.session.userId, reportId]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(409).send(
                "Report not found or already reviewed"
            );
        }

        await client.query(
            `INSERT INTO report_reviews
                (report_id, admin_id, action, notes)
             VALUES ($1, $2, $3, $4)`,
            [
                reportId,
                req.session.userId,
                action,
                adminNotes.trim() || null
            ]
        );

        await client.query("COMMIT");

        res.redirect("/admin");

    } catch (err) {
        if (client) {
            await client.query("ROLLBACK").catch(console.error);
        }

        console.error("Error reviewing report:", err);
        res.status(500).send("Unable to review report");

    } finally {
        if (client) {
            client.release();
        }
    }

});

app.get("/message", requireAuth, async (req, res) => {
  const senderId = req.session.userId;
  const receiverId = parseInt(req.query.user_id, 10);

  if (!Number.isInteger(receiverId)) {
    return res.status(400).send("Invalid receiver");
  }

  try {
      const result = await db.query(`
          SELECT * FROM messages
          WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
          ORDER BY created_at ASC
      `, [senderId, receiverId]);

      const user = await db.query(`
          SELECT * FROM users
          WHERE (user_id = $1)
          ORDER BY created_at ASC
      `, [receiverId]);
      const name = user.rows[0]?.first_name;
      const messages = result.rows;
      res.render('message.ejs', { senderId, receiverId, messages , name });
      
  } catch (err) {
      console.error('Error fetching messages:', err);
      res.status(500).send('Error fetching messages');
  }
  // res.render("message.ejs", {
  //   userId: req.session.userId
  // });
})
app.get("/api/users/search", requireAuth, async (req, res) => {
  const search = String(req.query.q || "").trim();

  if (search.length < 2) {
    return res.json([]);
  }

  try {
    const result = await db.query(
      `SELECT user_id, first_name, last_name
       FROM users
       WHERE user_id <> $1
         AND (first_name ILIKE $2 OR last_name ILIKE $2)
       ORDER BY first_name
       LIMIT 20`,
      [req.session.userId, `%${search}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

app.get("/chat", requireAuth, async (req, res) => {
    const senderId = req.session.userId;
    const receiverId = req.query.user_id
        ? Number(req.query.user_id)
        : null;

    if (receiverId !== null &&
        (!Number.isSafeInteger(receiverId) || receiverId <= 0 || receiverId === senderId)) {
        return res.status(400).send("Invalid receiver");
    }

    try {
        // Get users with existing conversations
        const usersResult = await db.query(
            `SELECT u.user_id, u.first_name, u.last_name
             FROM users u
             WHERE u.user_id IN (
                 SELECT
                     CASE
                         WHEN sender_id = $1 THEN receiver_id
                         ELSE sender_id
                     END
                 FROM messages
                 WHERE sender_id = $1 OR receiver_id = $1
             )
             ORDER BY u.first_name, u.last_name`,
            [senderId]
        );

        const users = usersResult.rows;

        let messages = [];
        let selectedUser = null;

        if (receiverId !== null) {
            const selectedResult = await db.query(
                `SELECT user_id, first_name, last_name
                 FROM users
                 WHERE user_id = $1`,
                [receiverId]
            );

            if (selectedResult.rows.length === 0) {
                return res.status(404).send("User not found");
            }

            selectedUser = selectedResult.rows[0];

            const messagesResult = await db.query(
                `SELECT message_id, sender_id, receiver_id,
                        content, created_at
                 FROM messages
                 WHERE (sender_id = $1 AND receiver_id = $2)
                    OR (sender_id = $2 AND receiver_id = $1)
                 ORDER BY created_at ASC, message_id ASC`,
                [senderId, receiverId]
            );

            messages = messagesResult.rows;
        }

        res.render("chat.ejs", {
            users,
            senderId,
            receiverId,
            selectedUser,
            messages
        });

    } catch (err) {
        console.error("Error loading chats:", err);
        res.status(500).send("Unable to load chats");
    }
});


app.get("/submitReport", requireRole("landlord"), (req, res) => {
    res.render("submitReport.ejs");
});


app.post("/submitReport", requireRole("landlord"), async (req, res) => {
    const landlordId = req.session.userId;

    const {
        firstName,
        lastName,
        propertyAddress,
        tenancyStart,
        tenancyEnd,
        paymentHistory,
        propertyCondition,
        description,
        wouldRentAgain
    } = req.body;

    const validPayments = ["on_time", "occasionally_late", "frequently_late"];
    const validConditions = ["good", "fair", "poor"];
    const validRentAgain = ["yes", "no", "unsure"];

    const start = new Date(tenancyStart);
    const end = tenancyEnd ? new Date(tenancyEnd) : null;

    if (
        typeof firstName !== "string" || !firstName.trim() ||
        firstName.trim().length > 100 ||
        typeof lastName !== "string" || !lastName.trim() ||
        lastName.trim().length > 100 ||
        typeof propertyAddress !== "string" || !propertyAddress.trim() ||
        propertyAddress.length > 500 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tenancyStart || "") ||
        Number.isNaN(start.getTime()) ||
        (tenancyEnd && (
            !/^\d{4}-\d{2}-\d{2}$/.test(tenancyEnd) ||
            Number.isNaN(end.getTime()) ||
            end < start
        )) ||
        !validPayments.includes(paymentHistory) ||
        !validConditions.includes(propertyCondition) ||
        !validRentAgain.includes(wouldRentAgain) ||
        (description != null && (
            typeof description !== "string" ||
            description.length > 2000
        ))
    ) {
        return res.status(400).send("Invalid report information");
    }

    try {
        await db.query(
            `INSERT INTO tenant_reports (
                landlord_id,
                tenant_first_name,
                tenant_last_name,
                property_address,
                tenancy_start,
                tenancy_end,
                payment_history,
                property_condition,
                description,
                would_rent_again
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                landlordId,
                firstName.trim(),
                lastName.trim(),
                propertyAddress.trim(),
                tenancyStart,
                tenancyEnd || null,
                paymentHistory,
                propertyCondition,
                description?.trim() || null,
                wouldRentAgain
            ]
        );

        res.redirect("/landlord");

    } catch (err) {
        console.error("Error submitting report:", err);
        res.status(500).send("Unable to submit report");
    }
});

app.get("/requestReport", requireRole("landlord"), async (req, res) => {
    const tenantName = String(req.query.tenantName || "").trim();
    let reports = [];

    if (tenantName) {
        if (tenantName.length > 200) {
            return res.status(400).send("Tenant name is too long");
        }

        try {
            const result = await db.query(
                `SELECT
                    report_id,
                    tenant_first_name,
                    tenant_last_name,
                    property_address,
                    payment_history,
                    property_condition,
                    status
                 FROM tenant_reports
                 WHERE status = 'approved'
                   AND LOWER(
                       CONCAT_WS(' ', tenant_first_name, tenant_last_name)
                   ) = LOWER($1)
                 ORDER BY created_at DESC`,
                [tenantName.replace(/\s+/g, " ")]
            );

            reports = result.rows;

        } catch (err) {
            console.error("Error searching reports:", err);
            return res.status(500).send("Unable to search reports");
        }
    }

    res.render("requestReport.ejs", {
        reports,
        tenantName
    });
});

app.get("/requestReport/:id", requireRole("landlord"), async (req, res) => {
    const reportId = Number(req.params.id);

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
        return res.status(400).send("Invalid report ID");
    }

    try {
        const result = await db.query(
            `SELECT
                report_id,
                tenant_first_name,
                tenant_last_name,
                property_address,
                tenancy_start,
                tenancy_end,
                payment_history,
                property_condition,
                description,
                would_rent_again,
                created_at
             FROM tenant_reports
             WHERE report_id = $1
               AND status = 'approved'`,
            [reportId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send("Approved report not found");
        }

        res.render("requestedReportDetails.ejs", {
            report: result.rows[0]
        });

    } catch (err) {
        console.error("Error loading approved report:", err);
        res.status(500).send("Unable to load report");
    }
});

app.get("/dashboard", requireAuth, (req, res) => {
    const allowedRoles = ["tenant", "landlord", "lawyer", "admin"];

    if (!allowedRoles.includes(req.session.role)) {
        return res.status(403).send("Invalid user role");
    }

    res.redirect(`/${req.session.role}`);
});

app.get("/pricing", (req, res) => {
    res.render("pricing.ejs");
});

app.post("/logout", requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Unable to log out");
        }

        res.clearCookie("connect.sid", {
            path: "/"
        });

        res.setHeader("Cache-Control", "no-store");
        res.redirect("/login");
    });
});

app.get("/viewReport", requireRole("landlord"), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT report_id, tenant_first_name, tenant_last_name,
                    property_address, tenancy_start, tenancy_end,
                    payment_history, property_condition,
                    description, would_rent_again, status, created_at
             FROM tenant_reports
             WHERE landlord_id = $1
             ORDER BY created_at DESC, report_id DESC`,
            [req.session.userId]
        );
        const reviewsResult = await db.query(
            `SELECT
                rr.report_id,
                rr.action,
                rr.notes,
                rr.created_at,
                u.first_name,
                u.last_name
            FROM report_reviews rr
            JOIN tenant_reports tr ON rr.report_id = tr.report_id
            JOIN users u ON rr.admin_id = u.user_id
            WHERE tr.landlord_id = $1
            ORDER BY rr.created_at ASC, rr.review_id ASC`,
            [req.session.userId]
        );

        res.render("viewReport.ejs", {
            reports: result.rows,
            reviews: reviewsResult.rows
        });

    } catch (err) {
        console.error("Error loading reports:", err);
        res.status(500).send("Unable to load reports");
    }
});

const server = app.listen(port, () => {

  console.log(`Server running on port ${port}`);
});

const io = new Server(server);

const chatNamespace = io.of("/chat");

// Give Socket.IO access to Express sessions
chatNamespace.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Reject unauthenticated connections
chatNamespace.use((socket, next) => {
  const userId = socket.request.session?.userId;

  if (!userId) {
    return next(new Error("Unauthorized"));
  }

  next();
});
// Listen for new connections
// chatNamespace.on('connection', (socket) => {
//   // Handle messages from clients
//   socket.on('message', (message) => {
//     // Broadcast the message to all other clients in the namespace
//     chatNamespace.emit('message', message);
//   });
// });

chatNamespace.on("connection", (socket) => {
  const senderId = socket.request.session.userId;

  console.log(`User ${senderId} connected`);

  // Each user joins a room associated with their account
  socket.join(`user:${senderId}`);

  socket.on("message", async (data) => {
    const receiverId = Number(data?.receiverId);
    const message = data?.message;

    if (
      !Number.isSafeInteger(receiverId) ||
      receiverId <= 0 ||
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return;
    }

    try {
      const result = await db.query(
        `INSERT INTO messages (sender_id, receiver_id, content)
         VALUES ($1, $2, $3)
         RETURNING message_id, created_at`,
        [senderId, receiverId, message.trim()]
      );

      const savedMessage = {
        messageId: result.rows[0].message_id,
        senderId,
        receiverId,
        message: message.trim(),
        createdAt: result.rows[0].created_at
      };

      // Deliver to the recipient's connected devices
      chatNamespace.to(`user:${receiverId}`).emit("message", savedMessage);

      // Deliver to the sender's other connected devices
      chatNamespace.to(`user:${senderId}`).emit("message", savedMessage);

    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${senderId} disconnected`);
  });
});