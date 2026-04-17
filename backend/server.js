// server.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

/* ROUTES */
app.use("/stake", require("./routes/stake"));
app.use("/withdraw", require("./routes/withdraw"));
app.use("/projects", require("./routes/projects"));

app.get("/", (req,res)=>{
  res.send("ALBUKHR API RUNNING 🚀");
});

const PORT = 3000;

app.listen(PORT, ()=>{
  console.log("Server running on http://localhost:" + PORT);
});
