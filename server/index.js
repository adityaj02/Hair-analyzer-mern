/********************************************************************
 * server/index.js – Railway FIXED VERSION
 ********************************************************************/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const app = express();

/* -------------------------------------------------
   CORS (Frontend + Localhost)
------------------------------------------------- */
app.use(
  cors({
    origin: [
      "https://hair-analyzer-mern.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));

/* -------------------------------------------------
   Tips
------------------------------------------------- */
const hairCareTips = [
  "Massage your scalp daily for 5-10 minutes to improve blood circulation",
  "Use a mild, sulfate-free shampoo to avoid stripping natural oils",
  "Avoid hot water showers as they can dry out your scalp",
  "Trim your hair regularly every 6-8 weeks to prevent split ends",
  "Eat a protein-rich diet including eggs, nuts, and fish"
];

/* -------------------------------------------------
   Dermatologist Loading
------------------------------------------------- */
let dermatologists = [];

const loadDermatologists = () => {
  const csvPath = path.join(__dirname, "data", "zocdoc.csv");

  console.log("Reading CSV from:", csvPath);

  if (!fs.existsSync(csvPath)) {
    console.log("CSV NOT FOUND! Loading fallback data.");
    dermatologists = [
      {
        name: "Dr Sample",
        qualification: "MD Dermatology",
        speciality: "Dermatology",
        location: "Mumbai",
        phone: "+91 9876543210",
        address: "Sample Clinic",
        website: "sample.com",
        registration: "MH-12345"
      }
    ];
    return;
  }

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", (row) => {
      const spec =
        row["speciality"] ||
        row["Speciality"] ||
        row["Specialty"] ||
        "";

      if (
        spec.toLowerCase().includes("dermat") ||
        spec.toLowerCase().includes("skin") ||
        spec.toLowerCase().includes("hair")
      ) {
        dermatologists.push({
          name: row["doctor_name"] || row["Name"],
          qualification: row["qualification"] || "N/A",
          speciality: spec,
          location: row["city"] || "",
          phone: row["phone"] || "",
          address: row["address"] || "",
          website: row["website"] || "",
          registration: row["registration"] || "N/A"
        });
      }
    })
    .on("end", () => {
      console.log(`✔ Loaded ${dermatologists.length} dermatologists`);
    });
};

loadDermatologists();

/* -------------------------------------------------
   Root
------------------------------------------------- */
app.get("/", (req, res) => res.send("Backend Running ✔"));

/* -------------------------------------------------
   Doctors API
------------------------------------------------- */
app.post("/api/doctors", (req, res) => {
  res.json({
    total: dermatologists.length,
    doctors: dermatologists,
  });
});

/* -------------------------------------------------
   Gemini Image Analysis
------------------------------------------------- */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/analyze", async (req, res) => {
  try {
    const { base64Image, mimeType } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Analyze scalp image" },
            { inlineData: { mimeType, data: base64Image } }
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    const data = JSON.parse(raw);

    data.additionalHairCareTips = hairCareTips.slice(0, 3);

    res.json(data);
  } catch (error) {
    console.log("Gemini error:", error.message);
    res.status(500).json({ error: "AI Analysis failed" });
  }
});

/* -------------------------------------------------
   SERVER START — RAILWAY FIX ✔
------------------------------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on PORT:", PORT);
});
