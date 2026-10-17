import express from "express";
import rateLimit from "express-rate-limit";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.use("/ask", rateLimit({
  windowMs: 60000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get("/", (req, res) => {
  res.json({ status: "Kids Animal AI backend is running" });
});

app.post("/ask", async (req, res) => {
  try {
    const question = req.body?.question;

    if (typeof question !== "string" ||
        !question.trim() || question.length > 500) {
      return res.status(400).json({
        error: "Enter a question of up to 500 characters."
      });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return res.status(500).json({
        error: "Server API key is not configured."
      });
    }

    const apiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions:
            "You are a friendly animal and bird learning assistant " +
            "for children aged 5 to 10. Use simple English and short " +
            "educational answers. Stay on animals, birds, nature, and " +
            "basic science. Never request personal information. " +
            "Do not give dangerous instructions.",
          input: question.trim(),
          max_output_tokens: 180
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("OpenAI status:", apiResponse.status);
      return res.status(502).json({
        error: "AI service unavailable. Please try again."
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "No answer received. Please try again."
      });
    }

    res.json({ answer });
  } catch (error) {
    console.error("Request error:", error.message);
    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("Kids Animal AI backend started");
});
        
