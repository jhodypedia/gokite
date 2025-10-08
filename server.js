const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const flash = require("connect-flash");
const { sequelize } = require("./models");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret: process.env.SESSION_SECRET || "kiteai_secret",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// inject io
app.use((req, res, next) => { req.io = io; next(); });

// simple auth guard for API
function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ ok:false, error:"Unauthorized" });
  next();
}

// pages (hanya shell, data diambil via AJAX)
app.get("/", (req,res)=> res.redirect("/app"));
app.get("/app", (req, res)=> res.render("app", { user:req.session.user || null }));
app.get("/login", (req,res)=> res.render("login"));
app.get("/register", (req,res)=> res.render("register"));
app.get("/logout", (req,res)=> { req.session.destroy(()=>res.redirect("/login")); });

// API routes (JSON only)
app.use("/api/auth", require("./routes/api.auth"));
app.use("/api/wallets", auth, require("./routes/api.wallets"));
app.use("/api/bot", auth, require("./routes/api.bot"));
app.use("/api/logs", auth, require("./routes/api.logs"));
app.use("/api/interactions", auth, require("./routes/api.interactions"));
app.use("/api/me", auth, require("./routes/api.me"));

// DB + worker
const { initBotRunner } = require("./services/botRunner");
const { attachIO } = require("./utils/logger");
sequelize.sync({ alter: true })
  .then(()=>{
    console.log("✅ DB connected");
    attachIO(io);
    initBotRunner(io);
  })
  .catch(e=>console.error("DB error:", e.message));

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`🚀 http://localhost:${PORT}`));
