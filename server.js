const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const socketHandler = require("./socket/socketHandler");
const errorHandler = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
require("dotenv").config();

const app = express();

connectDB();

// const allowedOrigins = [
//   "http://localhost:3000",
//   "https://kan-ban-board-ai.vercel.app"
// ];

// app.use(cors({
//   origin: function(origin, callback){
//     if(!origin || allowedOrigins.includes(origin)){
//       callback(null, true);
//     }else{
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true
// }));

app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"],
  credentials: false
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Kanban Board API is running 🚀"
  });
});

app.use("/tasks", taskRoutes);
app.use("/auth",authRoutes);
app.use("/users",userRoutes);

const server = http.createServer(app);

const io = new Server(server,{
  cors:{
    origin: (origin, callback)=>{
      if(!origin || allowedOrigins.includes(origin)){
        callback(null,true);
      }else{
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods:["GET","POST","PUT"],
    credentials:true
  }
});

socketHandler(io);

app.use(errorHandler);

server.listen(5000,()=>{
  console.log("Server running on port 5000");
});
