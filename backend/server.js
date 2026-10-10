const express = require("express");

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use(require("./routes/todos"));


if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Todo API running on http://localhost:${port}`));
}

module.exports = app;
