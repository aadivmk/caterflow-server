import cors from "cors";
import express from "express";
import { z } from "zod";
import { checkPassword, getUserFromRequest, hashPassword, signToken } from "./lib/auth.js";
import { USERS_COLLECTION, getDb } from "./lib/client.js";
import { isCollectionKey, loadAll, removeRecord, resetDemoData, saveSettings, upsertRecord } from "./lib/store.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());

async function requireUser(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  req.user = user;
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const credentials = z.object({
  email: z.string().trim().min(1, "Email address is required").pipe(z.email("Enter a valid email address")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const user = {
      _id: crypto.randomUUID(),
      email,
      passwordHash: await hashPassword(parsed.data.password),
      fullName: "",
      role: "manager",
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(USERS_COLLECTION).insertOne(user);
    res.status(201).json({ token: await signToken(user), email });
  } catch (e) {
    if (e?.code === 11000) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = z
    .object({ email: z.string().trim().min(1), password: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your email and password." });
    return;
  }
  try {
    const db = await getDb();
    const user = await db.collection(USERS_COLLECTION).findOne({ email: parsed.data.email.toLowerCase() });
    if (!user || !(await checkPassword(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ error: "Wrong email or password." });
      return;
    }
    res.json({ token: await signToken(user), email: user.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const patchSchema = z.object({
  fullName: z.string().max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
});

app.get("/api/auth/profile", requireUser, async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db.collection(USERS_COLLECTION).findOne({ _id: req.user.id });
    if (!doc) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json({
      id: doc._id,
      email: doc.email,
      fullName: doc.fullName ?? "",
      role: doc.role,
      createdAt: doc.createdAt,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/auth/profile", requireUser, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { fullName, currentPassword, newPassword } = parsed.data;
  try {
    const db = await getDb();
    const doc = await db.collection(USERS_COLLECTION).findOne({ _id: req.user.id });
    if (!doc) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const updates = { updatedAt: new Date().toISOString() };
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: "Enter your current password to set a new one." });
        return;
      }
      const ok = await checkPassword(currentPassword, doc.passwordHash);
      if (!ok) {
        res.status(400).json({ error: "Current password is incorrect." });
        return;
      }
      updates.passwordHash = await hashPassword(newPassword);
    }
    await db.collection(USERS_COLLECTION).updateOne({ _id: req.user.id }, { $set: updates });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/data", requireUser, async (req, res) => {
  try {
    res.json(await loadAll(req.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/data/settings", requireUser, async (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings.id !== "string") {
    res.status(400).json({ error: "Settings with a string id are required." });
    return;
  }
  try {
    await saveSettings(settings, req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/data/reset", requireUser, async (req, res) => {
  try {
    res.json(await resetDemoData(req.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/data/:collection", requireUser, async (req, res) => {
  const { collection } = req.params;
  if (!isCollectionKey(collection)) {
    res.status(404).json({ error: "Unknown collection." });
    return;
  }
  const record = req.body;
  if (!record || typeof record.id !== "string" || record.id.length === 0) {
    res.status(400).json({ error: "A record with a string id is required." });
    return;
  }
  try {
    await upsertRecord(collection, record, req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/data/:collection", requireUser, async (req, res) => {
  const { collection } = req.params;
  if (!isCollectionKey(collection)) {
    res.status(404).json({ error: "Unknown collection." });
    return;
  }
  const id = req.query.id;
  if (!id) {
    res.status(400).json({ error: "id is required." });
    return;
  }
  try {
    await removeRecord(collection, id, req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err?.message ?? "Server error." });
});

app.listen(port, () => {
  console.log(`CaterFlow API listening on port ${port}`);
});
