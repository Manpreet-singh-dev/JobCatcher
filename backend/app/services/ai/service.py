import json
import logging
from typing import Any

import anthropic
import openai
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)

RESUME_PARSE_PROMPT = """You are an expert resume parser. Parse the following resume text into structured JSON.

Return a JSON object with these exact fields:
{
  "personal_info": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "summary": "Professional summary text",
  "experience": [
    {
      "company": "",
      "title": "",
      "location": "",
      "start_date": "",
      "end_date": "",
      "current": false,
      "description": "",
      "achievements": [""]
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "start_date": "",
      "end_date": "",
      "gpa": ""
    }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date": "",
      "expiry": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": [""],
      "url": ""
    }
  ],
  "languages": ["English"]
}

Resume text:
{resume_text}

Return ONLY valid JSON. No explanations."""

MATCH_SCORE_PROMPT = """You are an expert job-candidate matching analyst. Analyze how well this candidate matches the job description.

Candidate Profile (JSON):
{candidate_json}

Job Description:
{job_description}

Provide your analysis as a JSON object:
{{
  "overall_score": <0-100 integer>,
  "skill_match": {{
    "score": <0-100>,
    "matched_skills": ["skill1", "skill2"],
    "missing_skills": ["skill1"],
    "bonus_skills": ["skill1"]
  }},
  "experience_match": {{
    "score": <0-100>,
    "analysis": "Brief explanation"
  }},
  "education_match": {{
    "score": <0-100>,
    "analysis": "Brief explanation"
  }},
  "location_match": {{
    "score": <0-100>,
    "analysis": "Brief explanation"
  }},
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1"],
  "recommendation": "Brief hiring recommendation",
  "tailoring_suggestions": ["suggestion1", "suggestion2"]
}}

Return ONLY valid JSON."""

TAILOR_RESUME_PROMPT = """You are an expert resume writer. Tailor the candidate's resume for this specific job posting.

Original Resume (JSON):
{resume_json}

Job Description:
{job_description}

Match Analysis:
{match_analysis}

Modify the resume JSON to better match the job while keeping all information truthful. You may:
- Reorder skills to prioritize relevant ones
- Adjust the summary to highlight relevant experience
- Emphasize relevant achievements in experience descriptions
- Add relevant keywords naturally

Return the modified resume as a JSON object with the same structure as the input.
Return ONLY valid JSON."""

FORM_ANSWER_PROMPT = """You are filling out a job application form for a candidate. Answer the following question based on the candidate's profile.

Question: {question}

Candidate Resume Summary: {resume_summary}
Job Title: {job_title}
Company: {company}

Provide a professional, concise answer appropriate for a job application. If it's a yes/no question, answer directly. If it asks for a number, provide just the number. For open-ended questions, write 2-3 sentences max.

Answer:"""


class AIService:
    def __init__(self):
        self._anthropic_client: anthropic.AsyncAnthropic | None = None
        self._openai_client: openai.AsyncOpenAI | None = None

    @property
    def anthropic_client(self) -> anthropic.AsyncAnthropic:
        if self._anthropic_client is None:
            self._anthropic_client = anthropic.AsyncAnthropic(
                api_key=settings.ANTHROPIC_API_KEY
            )
        return self._anthropic_client

    @property
    def openai_client(self) -> openai.AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = openai.AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY
            )
        return self._openai_client

    async def _call_claude(self, prompt: str, max_tokens: int = 4096) -> str:
        response = await self.anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    async def _call_openai(self, prompt: str, max_tokens: int = 4096) -> str:
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content or ""

    async def _call_llm(self, prompt: str, max_tokens: int = 4096) -> str:
        if settings.ANTHROPIC_API_KEY:
            try:
                return await self._call_claude(prompt, max_tokens)
            except Exception as e:
                logger.warning(f"Claude API failed, falling back to OpenAI: {e}")
                if settings.OPENAI_API_KEY:
                    return await self._call_openai(prompt, max_tokens)
                raise

        if settings.OPENAI_API_KEY:
            return await self._call_openai(prompt, max_tokens)

        raise RuntimeError("No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.")

    def _extract_json(self, text: str) -> dict[str, Any]:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def parse_resume(self, resume_text: str) -> dict[str, Any]:
        prompt = RESUME_PARSE_PROMPT.format(resume_text=resume_text)
        response = await self._call_llm(prompt)
        return self._extract_json(response)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def score_match(
        self, candidate_json: dict[str, Any], job_description: str
    ) -> dict[str, Any]:
        prompt = MATCH_SCORE_PROMPT.format(
            candidate_json=json.dumps(candidate_json, indent=2),
            job_description=job_description,
        )
        response = await self._call_llm(prompt)
        return self._extract_json(response)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def tailor_resume(
        self,
        resume_json: dict[str, Any],
        job_description: str,
        match_analysis: dict[str, Any],
    ) -> dict[str, Any]:
        prompt = TAILOR_RESUME_PROMPT.format(
            resume_json=json.dumps(resume_json, indent=2),
            job_description=job_description,
            match_analysis=json.dumps(match_analysis, indent=2),
        )
        response = await self._call_llm(prompt, max_tokens=8192)
        return self._extract_json(response)

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=5))
    async def answer_question(
        self,
        question: str,
        resume_summary: str,
        job_title: str,
        company: str,
    ) -> str:
        prompt = FORM_ANSWER_PROMPT.format(
            question=question,
            resume_summary=resume_summary,
            job_title=job_title,
            company=company,
        )
        response = await self._call_llm(prompt, max_tokens=512)
        return response.strip()


ai_service = AIService()
