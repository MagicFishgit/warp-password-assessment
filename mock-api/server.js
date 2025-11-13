import "dotenv/config"; //Load .evn file.
import express from "express";
import rateLimit from "express-rate-limit";

//Express config:
const app = express();
app.use(express.json({ limit: '5mb' }));
const PORT = process.env.MOCK_PORT || 4000;
const CORRECT_PASSWORD = process.env.MOCK_CORRECT_PASSWORD;

//Rate limit config:
const apiLimiter = rateLimit({
  windowMs: 1 * 1000, // = 1s
  limit: 10,

  handler: (req, res ) => {
    return res.status(429).json({ message: "Rate limit exceeded" });
  },
});

app.use("/v2/api/authenticate", apiLimiter);

//Endpoint config:
app.get("/v2/api/authenticate", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(400).send("Basic Auth required");
  }

  const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString(
    "utf8"
  );
  const [username, password] = credentials.split(":");

  console.log(`Mock API Attempt: User: ${username}, Pass: ${password}`);

  if (username === "John" && password === CORRECT_PASSWORD) {
    console.log("API Success");
    return res.status(200).json({
      message: "Success",
      url: `http://localhost:${PORT}/v2/api/upload/mock-temp-url`,
    });
  } else {
    console.log("API Failed");
    return res.status(401).send("Not Authorized");
  }
});

// POST endpoint:
app.post("/v2/api/upload/mock-temp-url", (req, res) => {
  console.log("Received submission package.");
  console.log("Name: ", req.body.name);
  console.log("Surname: ", req.body.surname);
  console.log("Email: ", req.body.email);
  console.log("Data from ZIP: ", req.body.data.substring(0, 50) + "...");
  res.status(200).json({ message: "Success" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Correct test password is set to: ${CORRECT_PASSWORD}`);
});
