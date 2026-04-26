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

TAILOR_RESUME_FOR_JOB = """You are an expert resume writer. You will make MINIMAL, targeted edits to the candidate's resume so it better matches the job description.

Rules:
1. PRESERVE the original resume almost entirely — personal info, summary, experience (company names, titles, dates, bullet points), education, certifications, and languages must remain UNCHANGED
2. ONLY modify these two sections:
   a. **Skills**: Reorder skills to put the most job-relevant ones first. You may add skills the candidate clearly possesses (evidenced by their experience/projects) but omitted. Do NOT invent skills the candidate does not have.
   b. **Projects**: Reorder projects to surface the most relevant ones first. You may lightly rephrase a project description to highlight technologies or outcomes that align with the JD, but do NOT change the project name, core facts, or technologies used.
3. Do NOT rewrite experience bullet points, professional summary, education, or any other section
4. Do NOT fabricate any information
5. Return the full resume as structured JSON matching the input schema — every field from the original must be present, with only Skills and Projects modified

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
