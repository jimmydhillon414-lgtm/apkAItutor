import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/*
|--------------------------------------------------------------------------
| AI TUTOR - SUPABASE EDGE FUNCTION
| Function: ai-proxy
|
| Supports:
| 1. voice-tutor
|    Text/speech-recognition input -> Groq GPT-OSS -> Tutor JSON
|
| 2. audio-tutor
|    Base64 audio -> Groq Whisper -> Groq GPT-OSS -> Tutor JSON
|
| Required Supabase Secret:
|   groq_AI
|
| IMPORTANT:
| - Supports conversation history from frontend
| - Keeps previous turns available to the AI
| - Returns structured tutor JSON
| - Does NOT invent a fake successful AI response when Groq fails
|--------------------------------------------------------------------------
*/

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Content-Type": "application/json",
};

/*
|--------------------------------------------------------------------------
| Safe JSON response
|--------------------------------------------------------------------------
*/
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

/*
|--------------------------------------------------------------------------
| Language -> ISO code
|--------------------------------------------------------------------------
*/
function getLanguageCode(language: string): string | undefined {
  const normalized = String(language || "")
    .trim()
    .toLowerCase();

  const languageMap: Record<string, string> = {
    english: "en",
    hindi: "hi",
    punjabi: "pa",
    spanish: "es",
    french: "fr",
    german: "de",
    italian: "it",
    portuguese: "pt",
    russian: "ru",
    japanese: "ja",
    korean: "ko",
    chinese: "zh",
    mandarin: "zh",
    arabic: "ar",
    bengali: "bn",
    urdu: "ur",
    tamil: "ta",
    telugu: "te",
    marathi: "mr",
    gujarati: "gu",
    kannada: "kn",
    malayalam: "ml",
    nepali: "ne",
    dutch: "nl",
    turkish: "tr",
  };

  return languageMap[normalized];
}

/*
|--------------------------------------------------------------------------
| Base64 -> Uint8Array
|--------------------------------------------------------------------------
*/
function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = String(base64 || "")
    .replace(/^data:audio\/[^;]+;base64,/i, "")
    .replace(/^data:application\/octet-stream;base64,/i, "")
    .replace(/\s/g, "");

  const binaryString = atob(cleaned);

  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/*
|--------------------------------------------------------------------------
| Normalize audio MIME type
|--------------------------------------------------------------------------
*/
function normalizeMimeType(
  mimeType: string | undefined,
  fileName: string | undefined
): string {
  const mime = String(mimeType || "")
    .trim()
    .toLowerCase();

  if (mime) {
    return mime;
  }

  const name = String(fileName || "")
    .trim()
    .toLowerCase();

  if (name.endsWith(".m4a")) return "audio/mp4";
  if (name.endsWith(".mp4")) return "audio/mp4";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".webm")) return "audio/webm";
  if (name.endsWith(".ogg")) return "audio/ogg";
  if (name.endsWith(".flac")) return "audio/flac";

  return "audio/mp4";
}

/*
|--------------------------------------------------------------------------
| File extension
|--------------------------------------------------------------------------
*/
function getFileExtension(
  mimeType: string,
  fileName?: string
): string {
  const existingName = String(fileName || "")
    .trim()
    .toLowerCase();

  if (existingName.includes(".")) {
    return existingName.split(".").pop() || "m4a";
  }

  const mime = mimeType.toLowerCase();

  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("mp4")) return "m4a";

  return "m4a";
}

/*
|--------------------------------------------------------------------------
| Sanitize user message
|--------------------------------------------------------------------------
*/
function sanitizeUserMessage(input: any): string {
  let userMessage = String(input || "").trim();

  if (!userMessage) {
    return "";
  }

  /*
  |--------------------------------------------------------------------------
  | Protect against accidental prompt injection from our own wrapper text
  |--------------------------------------------------------------------------
  */
  if (
    userMessage.includes("Your direct, smart") ||
    userMessage.includes("CRITICAL RULES") ||
    userMessage.includes("Respond ONLY with") ||
    userMessage.includes(
      "You are an expert AI speech and language tutor"
    )
  ) {
    return "";
  }

  /*
  |--------------------------------------------------------------------------
  | Remove common frontend prompt wrappers
  |--------------------------------------------------------------------------
  */
  userMessage = userMessage
    .replace(
      /^User's Latest Spoken\/Written Input:\s*/i,
      ""
    )
    .trim();

  /*
  |--------------------------------------------------------------------------
  | Remove surrounding quotes
  |--------------------------------------------------------------------------
  */
  if (
    userMessage.length >= 2 &&
    (
      (
        userMessage.startsWith('"') &&
        userMessage.endsWith('"')
      ) ||
      (
        userMessage.startsWith("'") &&
        userMessage.endsWith("'")
      )
    )
  ) {
    userMessage = userMessage
      .slice(1, -1)
      .trim();
  }

  return userMessage;
}

/*
|--------------------------------------------------------------------------
| Clean conversation history
|
| The frontend can send:
|
| conversationHistory: [
|   { role: "user", content: "Hello" },
|   { role: "assistant", content: "Hi!" }
| ]
|
| We only allow user/assistant messages.
|--------------------------------------------------------------------------
*/
function normalizeConversationHistory(
  history: any
): Array<{
  role: "user" | "assistant";
  content: string;
}> {
  if (!Array.isArray(history)) {
    return [];
  }

  const cleaned: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  for (const item of history) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const role =
      item.role === "assistant"
        ? "assistant"
        : item.role === "user"
          ? "user"
          : null;

    if (!role) {
      continue;
    }

    let content =
      item.content ??
      item.text ??
      item.message ??
      "";

    content = String(content || "")
      .trim();

    if (!content) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Limit individual history message size
    |--------------------------------------------------------------------------
    */
    if (content.length > 4000) {
      content = content.slice(0, 4000);
    }

    cleaned.push({
      role,
      content,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Keep only the most recent 20 conversation turns.
  |
  | This prevents the request from becoming unnecessarily large.
  |--------------------------------------------------------------------------
  */
  return cleaned.slice(-20);
}

/*
|--------------------------------------------------------------------------
| Parse tutor JSON
|--------------------------------------------------------------------------
*/
function parseTutorResponse(rawText: string): any {
  const defaultObject = {
    hasCorrection: false,
    originalText: "",
    correctedText: "",
    explanation: "",
    pronunciationScore: null,
    pronunciationTip:
      "Keep your pacing steady and speak clearly.",
    detectedEmotion: "Calm / Focused",
    emotionIntensity: 80,
    languageMismatch: false,
    mismatchNotice: "",
    detectedAccent:
      "Not enough audio information",
    roleplayContext: "General Practice",
    scenarioObjective:
      "Speaking Practice & Fluency",
    scenarioStage: "Active Practice",
    reply: "",
  };

  if (!rawText) {
    return defaultObject;
  }

  const cleanedText = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  /*
  |--------------------------------------------------------------------------
  | First attempt: direct JSON
  |--------------------------------------------------------------------------
  */
  try {
    const parsed = JSON.parse(cleanedText);

    return normalizeTutorObject(
      parsed,
      defaultObject
    );
  } catch (_) {
    // Continue.
  }

  /*
  |--------------------------------------------------------------------------
  | Second attempt: find JSON object
  |--------------------------------------------------------------------------
  */
  try {
    const jsonMatch =
      cleanedText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed =
        JSON.parse(jsonMatch[0]);

      return normalizeTutorObject(
        parsed,
        defaultObject
      );
    }
  } catch (_) {
    // Continue.
  }

  /*
  |--------------------------------------------------------------------------
  | Last fallback
  |--------------------------------------------------------------------------
  */
  return {
    ...defaultObject,
    reply: cleanedText,
  };
}

/*
|--------------------------------------------------------------------------
| Normalize tutor object
|--------------------------------------------------------------------------
*/
function normalizeTutorObject(
  parsed: any,
  defaultObject: any
) {
  if (!parsed || typeof parsed !== "object") {
    return defaultObject;
  }

  let pronunciationScore =
    parsed.pronunciationScore;

  /*
  |--------------------------------------------------------------------------
  | Do not manufacture a pronunciation score when actual acoustic audio
  | was not analyzed.
  |--------------------------------------------------------------------------
  */
  if (
    pronunciationScore !== null &&
    pronunciationScore !== undefined &&
    Number.isFinite(
      Number(pronunciationScore)
    )
  ) {
    pronunciationScore = Math.max(
      0,
      Math.min(
        100,
        Number(pronunciationScore)
      )
    );
  } else {
    pronunciationScore = null;
  }

  let emotionIntensity =
    Number(parsed.emotionIntensity);

  if (!Number.isFinite(emotionIntensity)) {
    emotionIntensity =
      defaultObject.emotionIntensity;
  }

  emotionIntensity = Math.max(
    0,
    Math.min(100, emotionIntensity)
  );

  return {
    ...defaultObject,
    ...parsed,

    hasCorrection:
      Boolean(parsed.hasCorrection),

    originalText:
      String(
        parsed.originalText ||
          ""
      ),

    correctedText:
      String(
        parsed.correctedText ||
          ""
      ),

    explanation:
      String(
        parsed.explanation ||
          ""
      ),

    pronunciationScore,

    pronunciationTip:
      String(
        parsed.pronunciationTip ||
          defaultObject.pronunciationTip
      ),

    detectedEmotion:
      String(
        parsed.detectedEmotion ||
          defaultObject.detectedEmotion
      ),

    emotionIntensity,

    languageMismatch:
      Boolean(
        parsed.languageMismatch
      ),

    mismatchNotice:
      String(
        parsed.mismatchNotice ||
          ""
      ),

    detectedAccent:
      String(
        parsed.detectedAccent ||
          defaultObject.detectedAccent
      ),

    roleplayContext:
      String(
        parsed.roleplayContext ||
          defaultObject.roleplayContext
      ),

    scenarioObjective:
      String(
        parsed.scenarioObjective ||
          defaultObject.scenarioObjective
      ),

    scenarioStage:
      String(
        parsed.scenarioStage ||
          defaultObject.scenarioStage
      ),

    reply:
      String(
        parsed.reply ||
          ""
      ).trim(),
  };
}

/*
|--------------------------------------------------------------------------
| Build tutor system prompt
|--------------------------------------------------------------------------
*/
function buildSystemPrompt({
  activeProfileLang,
  level,
  day,
  currentScenario,
  scenarioObjective,
}: {
  activeProfileLang: string;
  level: string;
  day: string | number;
  currentScenario: string;
  scenarioObjective: string;
}) {
  return `
You are a professional, friendly, conversational AI language tutor.

Your job is NOT to simply answer questions.

Your job is to have a REAL conversation with the learner while teaching the
target language naturally.

==================================================
LEARNER PROFILE
==================================================

Target language:
"${activeProfileLang}"

Level:
"${level}"

Current learning day:
"${day}"

Current scenario:
"${currentScenario}"

Scenario objective:
"${scenarioObjective}"

==================================================
CORE CONVERSATION RULE
==================================================

Have a natural back-and-forth conversation.

Remember and use the previous conversation turns supplied by the application.

Do NOT restart the conversation on every message.

Do NOT repeatedly say:
- "Let's talk more about..."
- "Tell me more..."
- "That's interesting..."
- "How can I help you?"

unless that response genuinely fits the conversation.

Instead, respond directly to what the learner just said.

If the learner asks a question, answer it.

If the learner tells you something, respond naturally and continue the
conversation.

If the learner asks for clarification, explain it simply.

If the learner makes a mistake, correct it naturally and continue speaking
with them.

==================================================
LANGUAGE RULE
==================================================

The learner is studying:
"${activeProfileLang}"

Use "${activeProfileLang}" for the actual teaching conversation.

At a beginner level, keep language simple.

As the learner demonstrates stronger ability, gradually make the conversation
more natural and challenging.

Do not unnecessarily switch languages.

If the learner uses another language because they are asking for help or
clarification, understand the intent and respond appropriately.

==================================================
GRAMMAR CORRECTION
==================================================

Look for meaningful grammar mistakes.

If there is a meaningful grammar mistake:

hasCorrection = true

Provide:
- originalText
- correctedText
- short explanation

Then continue the conversation naturally.

Do NOT turn every tiny informal phrase into a correction.

Do NOT interrupt natural conversation with long grammar lectures.

If the learner's sentence is already correct:

hasCorrection = false

correctedText = ""

explanation = ""

==================================================
PRONUNCIATION
==================================================

Be honest about pronunciation.

If the input is only text or speech-to-text transcription, you DO NOT have
enough acoustic information to reliably measure pronunciation.

In that situation:

pronunciationScore = null

detectedAccent = "Not enough audio information"

Give a useful general pronunciation tip only when appropriate.

If actual audio/acoustic information is supplied and genuinely analyzed,
a numerical pronunciation score may be provided.

Never invent an acoustic pronunciation score.

==================================================
EMOTION
==================================================

Estimate the conversational emotion only from the learner's words.

Choose exactly one:

- Joyful & Cheerful
- Anxious / Stressed
- Frustrated / Annoyed
- Sad / Melancholy
- Curious / Inquisitive
- Calm / Focused

Return emotionIntensity from 0 to 100.

Do not make sensitive psychological or medical conclusions.

==================================================
LANGUAGE MISMATCH
==================================================

Compare the learner's message with the target language.

If the learner appears to be using another language:

languageMismatch = true

Give a short friendly mismatchNotice.

Otherwise:

languageMismatch = false

mismatchNotice = ""

==================================================
SCENARIO
==================================================

Keep the conversation related to the current scenario when appropriate.

Return:

roleplayContext
scenarioObjective
scenarioStage

Do not force the scenario if the learner asks a legitimate question.

==================================================
RESPONSE STYLE
==================================================

The tutor should sound like a real human teacher:

- warm
- natural
- concise
- encouraging
- conversational
- adaptive
- not robotic
- not repetitive

Usually keep the spoken tutor reply to roughly 1-4 sentences.

If a correction is necessary, keep it brief.

Example style:

Learner:
"I am go to market yesterday."

Tutor:
"Almost! Say, 'I went to the market yesterday.' We use 'went' because
'go' changes to its past form. What did you buy there?"

That is the style we want:
CORRECTION + SHORT EXPLANATION + NATURAL FOLLOW-UP.

==================================================
IMPORTANT OUTPUT RULE
==================================================

Return ONLY valid JSON.

No markdown.

No code fences.

No text before or after the JSON.

Use exactly this structure:

{
  "hasCorrection": boolean,
  "originalText": "string",
  "correctedText": "string",
  "explanation": "string",
  "pronunciationScore": number_or_null,
  "pronunciationTip": "string",
  "detectedEmotion": "string",
  "emotionIntensity": number,
  "languageMismatch": boolean,
  "mismatchNotice": "string",
  "detectedAccent": "string",
  "roleplayContext": "string",
  "scenarioObjective": "string",
  "scenarioStage": "string",
  "reply": "string"
}
`;
}

/*
|--------------------------------------------------------------------------
| MAIN EDGE FUNCTION
|--------------------------------------------------------------------------
*/
serve(async (req) => {
  /*
  |--------------------------------------------------------------------------
  | CORS
  |--------------------------------------------------------------------------
  */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS_HEADERS,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | POST only
  |--------------------------------------------------------------------------
  */
  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error:
          "Method not allowed. Use POST.",
      },
      405
    );
  }

  try {
    /*
    |--------------------------------------------------------------------------
    | Read request
    |--------------------------------------------------------------------------
    */
    let requestBody: any = {};

    try {
      const rawBody =
        await req.text();

      if (rawBody) {
        requestBody =
          JSON.parse(rawBody);
      }
    } catch (parseError) {
      console.error(
        "JSON Parse Error:",
        parseError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Request settings
    |--------------------------------------------------------------------------
    */
    const mode =
      requestBody.mode ||
      "voice-tutor";

    const activeProfileLang =
      requestBody.profileLanguage ||
      requestBody.targetLanguage ||
      "English";

    const level =
      requestBody.level ||
      requestBody.proficiencyLevel ||
      "Beginner";

    const day =
      requestBody.day ||
      requestBody.dayNumber ||
      1;

    const currentScenario =
      requestBody.currentScenario ||
      requestBody.scenario ||
      "introduction";

    const scenarioObjective =
      requestBody.scenarioObjective ||
      "Speaking Practice & Fluency";

    /*
    |--------------------------------------------------------------------------
    | Conversation history
    |--------------------------------------------------------------------------
    */
    const conversationHistory =
      normalizeConversationHistory(
        requestBody.conversationHistory ||
        requestBody.messages ||
        requestBody.history
      );

    /*
    |--------------------------------------------------------------------------
    | Groq API key
    |--------------------------------------------------------------------------
    */
    const groqApiKey =
      Deno.env.get("groq_AI");

    if (!groqApiKey) {
      console.error(
        "Missing Supabase secret: groq_AI"
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Groq API key is not configured. Please add groq_AI to Supabase Edge Function secrets.",
        },
        500
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Variables
    |--------------------------------------------------------------------------
    */
    let userMessage = "";
    let transcribedText = "";

    const transcriptionLanguage =
      getLanguageCode(
        activeProfileLang
      ) || undefined;

    /*
    |--------------------------------------------------------------------------
    | AUDIO TUTOR MODE
    |--------------------------------------------------------------------------
    */
    if (mode === "audio-tutor") {
      console.log(
        "========================================"
      );

      console.log(
        "AI PROXY AUDIO TUTOR MODE"
      );

      console.log(
        "========================================"
      );

      const audioBase64 =
        requestBody.audioBase64 ||
        requestBody.audio ||
        requestBody.audioData;

      if (!audioBase64) {
        return jsonResponse(
          {
            success: false,
            error:
              "No audio data received. Send audioBase64.",
          },
          400
        );
      }

      const mimeType =
        normalizeMimeType(
          requestBody.mimeType,
          requestBody.fileName
        );

      const fileExtension =
        getFileExtension(
          mimeType,
          requestBody.fileName
        );

      let audioBytes: Uint8Array;

      try {
        audioBytes =
          base64ToUint8Array(
            audioBase64
          );
      } catch (audioDecodeError) {
        console.error(
          "Audio base64 decode error:",
          audioDecodeError
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Invalid base64 audio data.",
          },
          400
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Audio size limit
      |--------------------------------------------------------------------------
      */
      const maxAudioBytes =
        25 * 1024 * 1024;

      if (
        audioBytes.byteLength >
        maxAudioBytes
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Audio file is too large. Please record a shorter clip.",
          },
          413
        );
      }

      console.log(
        "Audio MIME:",
        mimeType
      );

      console.log(
        "Audio extension:",
        fileExtension
      );

      console.log(
        "Audio size:",
        audioBytes.byteLength,
        "bytes"
      );

      /*
      |--------------------------------------------------------------------------
      | Build multipart request
      |--------------------------------------------------------------------------
      */
      const audioBlob =
        new Blob(
          [audioBytes],
          {
            type: mimeType,
          }
        );

      const formData =
        new FormData();

      formData.append(
        "file",
        audioBlob,
        requestBody.fileName ||
          `ai-tutor-recording.${fileExtension}`
      );

      formData.append(
        "model",
        "whisper-large-v3-turbo"
      );

      if (transcriptionLanguage) {
        formData.append(
          "language",
          transcriptionLanguage
        );
      }

      formData.append(
        "response_format",
        "json"
      );

      formData.append(
        "temperature",
        "0"
      );

      /*
      |--------------------------------------------------------------------------
      | Groq Whisper
      |--------------------------------------------------------------------------
      */
      const transcriptionRes =
        await fetch(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${groqApiKey}`,
            },

            body: formData,
          }
        );

      if (!transcriptionRes.ok) {
        const transcriptionError =
          await transcriptionRes.text();

        console.error(
          "Groq transcription error:",
          transcriptionError
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Speech transcription failed.",
            details:
              transcriptionError,
          },
          transcriptionRes.status
        );
      }

      const transcriptionData =
        await transcriptionRes.json();

      transcribedText =
        String(
          transcriptionData?.text ||
            ""
        ).trim();

      console.log(
        "Transcribed Text:",
        transcribedText
      );

      if (!transcribedText) {
        return jsonResponse(
          {
            success: false,
            error:
              "No clear speech was detected in the recording.",
            transcribedText: "",
          },
          400
        );
      }

      userMessage =
        sanitizeUserMessage(
          transcribedText
        );
    } else {
      /*
      |--------------------------------------------------------------------------
      | VOICE / TEXT TUTOR MODE
      |--------------------------------------------------------------------------
      */
      const rawInput =
        requestBody.prompt ||
        requestBody.message ||
        requestBody.text ||
        "";

      userMessage =
        sanitizeUserMessage(
          rawInput
        );

      transcribedText =
        userMessage;
    }

    /*
    |--------------------------------------------------------------------------
    | Do not silently replace empty input with fake "Hello".
    |--------------------------------------------------------------------------
    */
    if (!userMessage) {
      return jsonResponse(
        {
          success: false,
          error:
            "No user message was received.",
        },
        400
      );
    }

    console.log(
      "Clean User Message:",
      userMessage
    );

    console.log(
      "Conversation history turns:",
      conversationHistory.length
    );

    /*
    |--------------------------------------------------------------------------
    | Build system prompt
    |--------------------------------------------------------------------------
    */
    const systemPrompt =
      buildSystemPrompt({
        activeProfileLang,
        level,
        day,
        currentScenario,
        scenarioObjective,
      });

    /*
    |--------------------------------------------------------------------------
    | Build conversation messages
    |--------------------------------------------------------------------------
    */
    const groqMessages: Array<any> = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    /*
    |--------------------------------------------------------------------------
    | Add previous conversation
    |--------------------------------------------------------------------------
    */
    for (const message of conversationHistory) {
      groqMessages.push({
        role: message.role,
        content: message.content,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT:
    |
    | The current message is added separately.
    |
    | This means the current message should NOT also be duplicated inside
    | conversationHistory.
    |--------------------------------------------------------------------------
    */
    groqMessages.push({
      role: "user",
      content: userMessage,
    });

    /*
    |--------------------------------------------------------------------------
    | Groq request
    |--------------------------------------------------------------------------
    */
    console.log(
      "Sending request to Groq GPT-OSS..."
    );

    const groqPayload = {
      model: "openai/gpt-oss-120b",

      messages:
        groqMessages,

      temperature: 0.75,

      max_tokens: 700,

      response_format: {
        type: "json_object",
      },
    };

    const groqRes =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${groqApiKey}`,
          },

          body:
            JSON.stringify(
              groqPayload
            ),
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Groq error
    |--------------------------------------------------------------------------
    */
    if (!groqRes.ok) {
      const errText =
        await groqRes.text();

      console.error(
        "Groq returned error:",
        groqRes.status,
        errText
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The AI tutor service returned an error.",
          details:
            errText,
          status:
            groqRes.status,
        },
        502
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Read Groq response
    |--------------------------------------------------------------------------
    */
    const groqData =
      await groqRes.json();

    const rawText =
      groqData?.choices?.[0]
        ?.message?.content || "";

    console.log(
      "Groq response received."
    );

    /*
    |--------------------------------------------------------------------------
    | Parse tutor JSON
    |--------------------------------------------------------------------------
    */
    const parsed =
      parseTutorResponse(
        rawText
      );

    /*
    |--------------------------------------------------------------------------
    | Make sure reply exists
    |--------------------------------------------------------------------------
    */
    if (!parsed.reply) {
      console.error(
        "Groq returned no tutor reply:",
        rawText
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The AI tutor returned an empty response.",
        },
        502
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Final response
    |--------------------------------------------------------------------------
    */
    const responseObject = {
      hasCorrection:
        parsed.hasCorrection,

      originalText:
        parsed.originalText ||
        userMessage,

      correctedText:
        parsed.correctedText,

      explanation:
        parsed.explanation,

      pronunciationScore:
        parsed.pronunciationScore,

      pronunciationTip:
        parsed.pronunciationTip,

      detectedEmotion:
        parsed.detectedEmotion,

      emotionIntensity:
        parsed.emotionIntensity,

      languageMismatch:
        parsed.languageMismatch,

      mismatchNotice:
        parsed.mismatchNotice,

      detectedAccent:
        parsed.detectedAccent,

      roleplayContext:
        parsed.roleplayContext ||
        currentScenario,

      scenarioObjective:
        parsed.scenarioObjective ||
        scenarioObjective,

      scenarioStage:
        parsed.scenarioStage ||
        "Active Practice",

      transcribedText:
        transcribedText,

      inputMode:
        mode,

      day:
        day,

      reply:
        parsed.reply.trim(),
    };

    /*
    |--------------------------------------------------------------------------
    | Return frontend-compatible format
    |--------------------------------------------------------------------------
    */
    return jsonResponse({
      success: true,

      ...responseObject,

      /*
      |--------------------------------------------------------------------------
      | Existing frontend compatibility
      |--------------------------------------------------------------------------
      */
      response:
        JSON.stringify(
          responseObject
        ),

      choices: [
        {
          message: {
            content:
              JSON.stringify(
                responseObject
              ),
          },
        },
      ],
    });
  } catch (codeError) {
    /*
    |--------------------------------------------------------------------------
    | Fatal error
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | We return success:false here.
    |
    | We do NOT pretend that the AI answered successfully.
    |--------------------------------------------------------------------------
    */
    console.error(
      "AI Proxy Fatal Error:",
      codeError instanceof Error
        ? codeError.message
        : codeError
    );

    return jsonResponse(
      {
        success: false,

        error:
          "AI tutor backend failed.",

        details:
          codeError instanceof Error
            ? codeError.message
            : String(codeError),
      },
      500
    );
  }
});