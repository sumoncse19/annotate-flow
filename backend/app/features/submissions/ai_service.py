import json
import logging
import re

from groq import Groq

from app.core.config import settings
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)

_groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

SYSTEM_PROMPT = """You are an AI data analyst for a data annotation platform called AnnotateFlow.
You analyze uploaded files (images, audio, text) based on their metadata and content.
Return your analysis as valid JSON with exactly these fields:
- "summary": A 2-3 sentence analysis of the file
- "sentiment": One of "positive", "negative", "mixed", "neutral"
- "tags": A list of 3-5 relevant tags/categories for the file
- "quality_score": A number 1-10 rating the data quality for ML training
- "recommendations": 1-2 sentence suggestion for the annotation team
Return ONLY valid JSON, no markdown fences."""


def analyze_submission(processing_result: dict, file_name: str, content_type: str) -> dict:
    """Analyze a processed submission using Groq AI."""
    if not _groq_client:
        raise AppError("AI_NOT_CONFIGURED", "Groq API key not configured. Set GROQ_API_KEY in .env", 503)

    # Build context from processing result
    context_parts = [f"File: {file_name}", f"Type: {content_type}"]

    file_type = processing_result.get("type", "unknown")

    if file_type == "image":
        context_parts.append(f"Dimensions: {processing_result.get('width')}x{processing_result.get('height')}")
        context_parts.append(f"Format: {processing_result.get('format')}")
        context_parts.append(f"Color mode: {processing_result.get('mode')}")
        context_parts.append(f"File size: {processing_result.get('file_size_bytes', 0)} bytes")

    elif file_type == "text":
        context_parts.append(f"Characters: {processing_result.get('character_count')}")
        context_parts.append(f"Words: {processing_result.get('word_count')}")
        context_parts.append(f"Lines: {processing_result.get('line_count')}")
        preview = processing_result.get("preview", "")
        if preview:
            context_parts.append(f"Content preview:\n{preview[:2000]}")

    elif file_type == "audio":
        context_parts.append(f"File size: {processing_result.get('file_size_bytes', 0)} bytes")

    user_prompt = "\n".join(context_parts)

    try:
        response = _groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        raw = response.choices[0].message.content or ""
        return _parse_response(raw)
    except Exception as e:
        logger.error("Groq analysis failed: %s", e)
        raise AppError("AI_ERROR", f"AI analysis failed: {str(e)}", 502)


def _parse_response(text: str) -> dict:
    cleaned = re.sub(r"```json\s*", "", text)
    cleaned = re.sub(r"```\s*", "", cleaned).strip()
    parsed = json.loads(cleaned)

    # Validate required fields
    if not parsed.get("summary"):
        parsed["summary"] = "Analysis completed."
    if parsed.get("sentiment") not in ("positive", "negative", "mixed", "neutral"):
        parsed["sentiment"] = "neutral"
    if not isinstance(parsed.get("tags"), list):
        parsed["tags"] = []
    if not isinstance(parsed.get("quality_score"), (int, float)):
        parsed["quality_score"] = 5
    else:
        parsed["quality_score"] = max(1, min(10, int(parsed["quality_score"])))
    if not parsed.get("recommendations"):
        parsed["recommendations"] = "No specific recommendations."

    parsed["provider"] = "groq"
    return parsed
