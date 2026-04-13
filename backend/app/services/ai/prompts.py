"""LLM prompts shared by Celery workers and API code."""

MATCH_FOR_JOB_TAILORING = """You are a job-candidate matching expert. Given the candidate profile and job description below, return a JSON object with:
{{
  "match_score": 0-100,
  "matched_skills": ["skills found in both"],
  "missing_skills": ["required skills candidate lacks"],
  "match_reasons": ["3-5 bullet points explaining why this is a good match"],
  "concerns": ["any red flags or gaps"],
  "recommended": true | false
}}

Candidate Profile:
{candidate_json}

Job Description:
Title: {job_title}
Company: {company}
Location: {location}
Description: {job_description}
Required Skills: {required_skills}

Return ONLY valid JSON. No explanations."""

TAILOR_RESUME_FOR_JOB = """You are an expert resume writer. You will tailor the candidate's resume to better match the job description WITHOUT fabricating any experience.

Rules:
1. Only use information already present in the original resume
2. Rewrite bullet points using action verbs and keywords from the JD
3. Reorder sections/bullets to surface most relevant experience first
4. Update the professional summary to speak directly to this role
5. Do not change company names, job titles, dates, or education details
6. Maintain truthfulness at all times
7. Return the full tailored resume as structured JSON matching the input schema

Original Resume (JSON):
{resume_json}

Job Description:
Title: {job_title}
Company: {company}
Location: {location}
Description:
{job_description}

Required Skills: {required_skills}

Match Analysis:
{match_analysis}

Return ONLY the tailored resume as valid JSON matching the original schema. No explanations."""

RESUME_JSON_TO_LATEX_DOCUMENT = r"""You convert structured resume JSON into ONE self-contained LaTeX document that compiles with Tectonic/pdflatex.

Output rules (critical):
- Output ONLY valid LaTeX. No markdown code fences. No text before \documentclass or after \end{document}.
- Do NOT use \input, \include, \write18, shell-escape, or external files.
- Escape every LaTeX special character in user-supplied strings from the JSON (# $ % & ~ _ ^ { } \). Prefer \texttt{} for emails and URLs; use \detokenize{} for long free text when needed.
- Use only common packages (article, geometry, enumitem, hyperref, parskip, fontenc, inputenc).

Document structure:
- \documentclass[11pt]{article} with utf8 input, T1 font encoding, letterpaper geometry (0.75in margins), parskip, compact lists.
- Centered header: full name (large), then one line with email · phone · location · LinkedIn (omit missing parts).
- Section "Professional Summary" if summary exists.
- Section "Experience": each role with company, title, dates, then itemize for achievements/description.
- Section "Education", "Skills", "Projects" when data exists.

Resume JSON (use only facts from this data; do not invent employers or degrees):
__RESUME_JSON__
"""
