/********************************************************************
 * server/index.js (FINAL — Railway Compatible + CSV FIXED)
 ********************************************************************/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const csv = require("csv-parser");
const pathModule = require("path");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 5000;

/* -------------------------------------------------
   CORS
------------------------------------------------- */
app.use(
  cors({
    origin: [
      "https://hair-analyzer-mern.vercel.app",
      "http://localhost:5173",
    ],
  })
);

app.use(express.json({ limit: "10mb" }));

/* -------------------------------------------------
   LOAD CSV
------------------------------------------------- */

let dermatologists = [];

const loadDermatologists = () => {
  const csvPath = pathModule.join(__dirname, "data", "zocdoc.csv"); 
  console.log("Reading CSV from:", csvPath);

  if (!fs.existsSync(csvPath)) {
    console.log("❌ CSV Not Found. Using fallback doctor list.");
    dermatologists = [
      {
        name: "Dr. Sample",
        qualification: "MD Dermatology",
        speciality: "Dermatology",
        location: "Mumbai",
        phone: "+91 9876543210",
        address: "Sample Clinic",
        website: "sample.com",
        registration: "MH-12345",
      },
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
          registration: row["registration"] || "N/A",
          source: "CSV",
        });
      }
    })
    .on("end", () => {
      console.log("Loaded", dermatologists.length, "dermatologists.");
    });
};

loadDermatologists();

/* -------------------------------------------------
   GEMINI
------------------------------------------------- */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* -------------------------------------------------
   ROOT
------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("Backend Running ✔ Railway OK");
});

/* -------------------------------------------------
   ANALYZE IMAGE
------------------------------------------------- */
app.post("/api/analyze", async (req, res) => {
  const { base64Image, mimeType } = req.body;

  if (!base64Image || !mimeType)
    return res.status(400).json({ error: "Missing image data" });

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        grade: { type: SchemaType.STRING },
        percentageLoss: { type: SchemaType.NUMBER },
        analysisSummary: { type: SchemaType.STRING },
        tips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        doctorConsultationAdvice: { type: SchemaType.STRING },
      },
      required: ["grade", "percentageLoss", "analysisSummary", "tips", "doctorConsultationAdvice"],
    };

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Analyze this scalp image." },
            { inlineData: { mimeType, data: base64Image } },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: "You are an AI dermatology specialist." }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    console.error("Gemini Error:", err.message);
    res.status(500).json({ error: "Analysis failed" });
  }
});

/* -------------------------------------------------
   SEARCH DOCTORS
------------------------------------------------- */
app.post("/api/doctors", (req, res) => {
  const { location } = req.body;
  if (!location) return res.json({ doctors: [] });

  const filtered = dermatologists.filter((d) =>
    d.location.toLowerCase().includes(location.toLowerCase())
  );

  res.json({ doctors: filtered });
});

/* -------------------------------------------------
   START SERVER
------------------------------------------------- */
app.listen(port, () => console.log(`Server running → ${port}`));
