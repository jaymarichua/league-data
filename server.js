require("dotenv").config();

const express = require("express");
const path = require("path");
const { listChampions, getChampionWithAbilities } = require("./src/services/champions");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Cache champion list for the lifetime of the process — it only changes on patch day
let championsCache = null;

app.get("/api/champions", async (req, res, next) => {
  try {
    if (!championsCache) championsCache = await listChampions();
    res.json(championsCache);
  } catch (err) {
    next(err);
  }
});

app.get("/api/champions/:id", async (req, res, next) => {
  try {
    const champion = await getChampionWithAbilities(req.params.id);
    res.json(champion);
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
