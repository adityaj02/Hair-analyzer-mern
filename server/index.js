/********************************************************************
 * server/index.js (UPDATED FOR GEMINI 2.5 FLASH — SDK 0.24.1 COMPATIBLE)
 ********************************************************************/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const csv = require("csv-parser");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const app = express();
const port = 5000;

/* -------------------------------------------------
   HAIR CARE TIPS
------------------------------------------------- */
const hairCareTips = [
  "Massage your scalp daily for 5-10 minutes to improve blood circulation",
  "Use a mild, sulfate-free shampoo to avoid stripping natural oils",
  "Avoid hot water showers as they can dry out your scalp",
  "Trim your hair regularly every 6-8 weeks to prevent split ends",
  "Eat a protein-rich diet including eggs, nuts, and fish",
];

/* -------------------------------------------------
   DERMATOLOGIST CACHE
------------------------------------------------- */
let dermatologists = [];

const loadDermatologists = () => {
  const path = "./data/zocdoc.csv";

  if (!fs.existsSync(path)) {
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

  fs.createReadStream(path)
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
      console.log(`Loaded ${dermatologists.length} dermatologists.`);
    });
};

loadDermatologists();

/* -------------------------------------------------
   SERVER SETUP
------------------------------------------------- */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => res.send("Backend Running"));

/* -------------------------------------------------
   IMAGE ANALYSIS (Gemini 2.5 Flash – SDK 0.24.1 FORMAT)
------------------------------------------------- */
app.post("/api/analyze", async (req, res) => {
  const { base64Image, mimeType } = req.body;

  if (!base64Image || !mimeType) {
    return res.status(400).json({ error: "Missing image data." });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"   // ✔ CORRECT MODEL NAME
    });

    const systemInstructionText = `
      Act as an AI Dermatologist specializing in Alopecia.
      Analyze the scalp image.
      Respond ONLY in JSON following the schema.
    `;

    const userQuery = "Analyze this scalp image for hair loss.";

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
            { text: userQuery },
            {
              inlineData: {
                mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      systemInstruction: { parts: [{ text: systemInstructionText }] },

      // ✔ CORRECT FOR SDK 0.24.1
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) throw new Error("Empty Gemini response");

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    parsed.additionalHairCareTips = [...hairCareTips]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    res.json(parsed);
  } catch (err) {
    console.error("Gemini API Error:", err.message);

    res.status(500).json({
      grade: "Error",
      percentageLoss: 0,
      analysisSummary: "Failed to analyze image.",
      tips: ["Try clearer lighting", "Avoid blurry photos"],
      doctorConsultationAdvice: "Retry with a clear image.",
      additionalHairCareTips: hairCareTips.slice(0, 3)
    });
  }
});

/* -------------------------------------------------
   START SERVER
------------------------------------------------- */
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
