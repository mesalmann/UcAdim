const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");

// data klasörü ve events.json yoksa oluştur
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

function loadEvents() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("loadEvents error:", err);
    return [];
  }
}

function saveEvents(events) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), "utf8");
}

// Orta katmanlar
app.use(cors());
app.use(express.json({ limit: "15mb" })); // base64 fotoğraf için limit geniş
app.use(express.static(path.join(__dirname, "public"))); // frontend

// ---- API ----

// Tüm eventleri al
app.get("/api/events", (req, res) => {
  const events = loadEvents().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(events);
});

// Yeni event oluştur
app.post("/api/events", (req, res) => {
  const body = req.body || {};
  if (!body.title) {
    return res.status(400).json({ error: "title zorunlu" });
  }

  const events = loadEvents();

  const id = Date.now().toString();

  const category = body.category || "Tiyatro";

  const newEvent = {
    id,
    title: body.title,
    category,
    date: body.date || "",
    venue: body.venue || "",
    summary: body.summary || "",
    heroImage: body.heroImage || "",
    photos: body.photos || "", // 'url1|||url2' string
    senaReview: "",
    senaMood: "",
    senaRating: 0,
    senaHighlight: "",
    senaPhoto: "",
    hanneReview: "",
    hanneMood: "",
    hanneRating: 0,
    hanneHighlight: "",
    hannePhoto: "",
    merveReview: "",
    merveMood: "",
    merveRating: 0,
    merveHighlight: "",
    mervePhoto: "",
    createdAt: new Date().toISOString()
  };

  events.push(newEvent);
  saveEvents(events);

  res.status(201).json(newEvent);
});

// Event güncelle (yorum, foto, vs hepsi buradan)
app.put("/api/events/:id", (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  const events = loadEvents();
  const index = events.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "event bulunamadı" });
  }

  // Eski event üzerine gelen datayı merge et
  const updated = {
    ...events[index],
    ...body,
    id, // güvenlik için id sabit
  };

  events[index] = updated;
  saveEvents(events);

  res.json(updated);
});

// Event sil
app.delete("/api/events/:id", (req, res) => {
  const { id } = req.params;
  const events = loadEvents();
  const index = events.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "event bulunamadı" });
  }

  events.splice(index, 1);
  saveEvents(events);

  res.json({ ok: true });
});

// Sağlık kontrolü
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
