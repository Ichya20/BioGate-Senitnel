import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock database
  const users = [
    { id: 1, name: "Ichya Ulumiddiin", role: "Super Admin", normal_phrase: "Akses Sistem Alpha", duress_phrase: "Akses Sistem Darurat" },
    { id: 2, name: "Abid Fadhilah Mustofa", role: "Admin", normal_phrase: "Buka Lab Enam", duress_phrase: "Buka Lab Darurat" },
    { id: 3, name: "Iklil Bahy Sabaiki", role: "Staff", normal_phrase: "Mulai Analisis Data", duress_phrase: "Hentikan Analisis Darurat" },
    { id: 4, name: "Nathan Domuni Pasaribu", role: "Staff", normal_phrase: "Verifikasi Keamanan", duress_phrase: "Keamanan Terancam" },
    { id: 5, name: "Nashir Khoirul Huda", role: "Staff", normal_phrase: "Otorisasi Modul", duress_phrase: "Modul Darurat" },
    { id: 6, name: "Arif Kurniawan", role: "Staff", normal_phrase: "Aktifkan Protokol", duress_phrase: "Protokol Darurat" },
  ];

  const accessLogs: any[] = [];

  // API Routes
  app.get("/api/users", (req, res) => {
    // Return minimal info for face detection selection mockup
    res.json(users.map(u => ({ id: u.id, name: u.name })));
  });

  app.post("/api/auth/verify-mfa", (req, res) => {
    const { user_id, spoken_phrase } = req.body;
    
    const user = users.find(u => u.id === Number(user_id));
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const spoken = (spoken_phrase || "").trim();
    let status = "DENIED";
    let isDuress = false;
    let responseData: any = null;

    if (spoken.toLowerCase() === user.normal_phrase.toLowerCase()) {
      status = "GRANTED";
      isDuress = false;
      responseData = {
        status: "success",
        token: Math.random().toString(36).substring(7),
        user: { name: user.name, role: user.role },
        redirect: `${user.role.toLowerCase().replace(/ /g, "-")}-dashboard`
      };
    } else if (spoken.toLowerCase() === user.duress_phrase.toLowerCase()) {
      status = "GRANTED";
      isDuress = true;
      
      console.warn(`!!! SECURITY BREACH !!! Duress protocol activated by ${user.name}`);
      // In a real app, this would hit a webhook or logging service
      
      responseData = {
        status: "success",
        token: "DU-"+Math.random().toString(36).substring(7),
        user: { name: user.name, role: user.role },
        redirect: `${user.role.toLowerCase().replace(/ /g, "-")}-dashboard`
      };
    }

    accessLogs.push({
      user_id,
      status,
      is_duress: isDuress,
      timestamp: new Date().toISOString()
    });

    if (status === "GRANTED") {
      return res.json(responseData);
    }

    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Voice biometric mismatch."
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
