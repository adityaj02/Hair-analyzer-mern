/********************************************************************
 * server/index.js (FINAL PRODUCTION VERSION FOR RAILWAY)
 * Gemini 2.5 Flash • CSV Doctor Loader • Vercel Frontend CORS Fixed
 ********************************************************************/

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const app = express();
const port = process.env.PORT || 5000;

/* -------------------------------------------------
   Resolve __dirname for ES modules
------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------
   ENABLE CORS (Vercel + Localhost)
------------------------------------------------- */
app.use(
  cors({
    origin: [
      "https://hair-analyzer-mern.vercel.app",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "15mb" }));

/* -------------------------------------------------
   STATIC HAIR CARE TIPS
------------------------------------------------- */
const hairCareTips = [
  "Massage your scalp daily for 5-10 minutes to improve blood circulation",
  "Use a mild, sulfate-free shampoo to avoid stripping natural oils",
  "Avoid hot water showers as they can dry out your scalp",
  "Eat a protein-rich diet including eggs, nuts, and fish",
  "Trim hair every 6-8 weeks to prevent split ends"
];

/* -------------------------------------------------
   LOAD DOCTORS FROM CSV
------------------------------------------------- */

let dermatologists = [];

function loadDermatologists() {
  const csvPath = path.join(__dirname, "data", "zocdoc.csv");

  console.log("Reading CSV from:", csvPath);

  if (!fs.existsSync(csvPath)) {
    console.log("⚠ CSV not found! Using fall-back doctor.");
    dermatologists = [
      {
        name: "Dr Test",
        qualification: "MD Dermatology",
        speciality: "Dermatology",
        location: "Mumbai",
        phone: "+91 9999999999",
        address: "Fallback Clinic",
        website: "example.com",
        registration: "MH-0000"
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
      console.log(`✔ Loaded ${dermatologists.length} dermatologists from CSV`);
    })
    .on("error", (err) => {
      console.error("❌ CSV Load Error:", err);
    });
}

loadDermatologists();

/* -------------------------------------------------
   GEMINI INIT
------------------------------------------------- */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* -------------------------------------------------
   ROOT ENDPOINT
------------------------------------------------- */
app.get("/", (req, res) => res.send("Backend Running ✔"));

/* -------------------------------------------------
   IMAGE ANALYSIS — GEMINI 2.5 FLASH
------------------------------------------------- */
app.post("/api/analyze", async (req, res) => {
  const { base64Image, mimeType } = req.body;

  if (!base64Image || !mimeType)
    return res.status(400).json({ error: "Missing image data." });

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const systemInstructionText = `
      Act as an AI Dermatologist. Analyze the scalp image for hair loss.
      Respond ONLY in VALID JSON using the exact schema.
    `;

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        grade: { type: SchemaType.STRING },
        percentageLoss: { type: SchemaType.NUMBER },
        analysisSummary: { type: SchemaType.STRING },
        tips: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        },
        doctorConsultationAdvice: { type: SchemaType.STRING }
      },
      required: [
        "grade",
        "percentageLoss",
        "analysisSummary",
        "tips",
        "doctorConsultationAdvice"
      ]
    };

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Analyze this scalp image for hair loss." },
            { inlineData: { mimeType, data: base64Image } }
          ]
        }
      ],
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Empty Gemini response");

    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    parsed.additionalHairCareTips = [...hairCareTips]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    res.json(parsed);
  } catch (err) {
    console.error("❌ Gemini Error:", err.message);
    return res.status(500).json({
      grade: "Error",
      percentageLoss: 0,
      analysisSummary: "Cannot analyze the image.",
      tips: ["Try clearer lighting", "Upload a non-blurry image"],
      doctorConsultationAdvice: "Retry with another picture.",
      additionalHairCareTips: hairCareTips.slice(0, 3)
    });
  }
});

/* -------------------------------------------------
   GET DOCTORS (Filtered)
------------------------------------------------- */
app.post("/api/doctors", async (req, res) => {
  const { location } = req.body;
  if (!location) return res.json({ doctors: dermatologists });

  const filtered = dermatologists.filter((d) =>
    d.location.toLowerCase().includes(location.toLowerCase())
  );

  res.json({
    doctors: filtered.length ? filtered : dermatologists
  });
});

/* -------------------------------------------------
   START SERVER
------------------------------------------------- */
app.listen(port, () => {
  console.log(`🚀 Server live on port ${port}`);
});
