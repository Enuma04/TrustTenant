import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { createCanvas, Image } from "canvas"
import bcrypt from "bcrypt";
import session from "express-session";
import { createServer } from 'http'; // Add this line
import { Server } from 'socket.io';  // Add this line
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});



db.connect();

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Local development only
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
      res.render("login.ejs", { error: "Invalid email or password" });
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

  try {
    const result = await db.query(`
      SELECT DISTINCT 
          CASE 
              WHEN sender_id = $1 THEN receiver_id 
              ELSE sender_id 
          END AS user_id
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
  `, [senderId]);

  // Extract the list of user IDs
  const userIds = result.rows.map(row => row.user_id);
  console.log("userIds:", userIds)

  // Query to get user details for the retrieved user IDs
  const usersResult = await db.query(`
      SELECT user_id, first_name FROM users
      WHERE user_id = ANY($1::int[])
  `, [userIds]);

  const users = usersResult.rows;
  
    res.render('chat.ejs', { users });
} catch (err) {
    console.error('Error fetching chats:', err);
    res.status(500).send('Error fetching chats');
}
})

app.get("/submitReport", (req, res) => {
  res.render("submitReport.ejs");
})


app.get("/logout", (req, res) => {
  // Clear the session or any authentication data
  // req.session.destroy(); // Example if using express-session
  req.session.destroy();
  res.setHeader('Cache-Control', 'no-store');
  res.redirect("/login");
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