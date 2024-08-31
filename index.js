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

app.use(session({
  secret: process.env.SESSION_SECRET, // replace with a secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));


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
      req.session.userId = user.user_id; // Store user ID in session
      res.redirect("/" + user.role);
    } else {
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

app.post("/tenant-info", async(req, res) => {
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

   res.redirect("/tenant");
  } catch (err) {
    console.error("Error adding tenant information:", err);
    res.status(500).send("Error adding tenant information");
  }
})

app.post("/landlord-info", async(req, res) =>{
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

   res.redirect("/landlord");
  } catch (err) {
    console.error("Error adding tenant information:", err);
    res.status(500).send("Error adding tenant information");
  }
})

app.post("/lawyer-info", async(req, res) =>{
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

   res.redirect("/lawyer");
  } catch (err) {
    console.error("Error adding tenant information:", err);
    res.status(500).send("Error adding tenant information");
  }
})

app.get("/landlord", (req, res) => {
 
  res.render("landlord.ejs"); // Render dashboard page
});

app.get("/login", (req, res) => {
 
  res.render("login.ejs"); // Render dashboard page
});

app.get("/signup", (req, res) => {
  
  res.render("signup.ejs"); // Render dashboard page
});

app.get("/tenantInfo", (req, res) => {
 
  res.render("tenantInfo.ejs"); // Render dashboard page
});

app.get("/landlordInfo", (req, res) => {
 
  res.render("landlordInfo.ejs"); // Render dashboard page
});

app.get("/lawyerInfo", (req, res) => {
 
  res.render("lawyerInfo.ejs"); // Render dashboard page
});

app.get("/tenant", (req, res) => {
  res.render("tenant.ejs");
})

app.get("/lawyer", (req, res) => {
  res.render("lawyer.ejs");
})
app.get("/pricing", (req, res) => {
  res.render("pricing.ejs");
})

app.get("/message", async (req, res) => {

  const senderId = 13//req.session.userId; // Assuming the user's ID is stored in the session /*CHANGE HERE */
 const receiverId =  parseInt(req.query.user_id);

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

app.get("/chat", async (req, res)=>{
  const senderId = 13; //req.session.userId; // Assuming the user's ID is stored in the session /*CHANGE HERE */
  req.session.userId = senderId;
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

const chatNamespace = io.of('/chat');
// Listen for new connections
// chatNamespace.on('connection', (socket) => {
//   // Handle messages from clients
//   socket.on('message', (message) => {
//     // Broadcast the message to all other clients in the namespace
//     chatNamespace.emit('message', message);
//   });
// });

chatNamespace.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('message', async (data) => {
    const { senderId, receiverId, message } = data;

    try {
      // Save message to the database
      await db.query(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)',
        [senderId, receiverId, message]
      );

      console.log( { senderId, receiverId, message } )

      // Broadcast message to the receiver
      chatNamespace.to(receiverId).emit('message', { senderId, message });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});