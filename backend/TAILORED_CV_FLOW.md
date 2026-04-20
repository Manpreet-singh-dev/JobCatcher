# Tailored CV Generation Flow

## Overview
This document describes the complete flow for generating tailored CVs from job postings or job cards.

## Flow Steps

### 1. **User Initiates Tailoring**
There are two entry points:

#### A. From Job Card (via `/jobs/{job_id}/tailor-and-email`)
- User clicks "Email CV + posting link" on a job card
- Frontend calls `POST /api/jobs/{job_id}/tailor-and-email`
- Creates an Application record with status `cv_preparing`
- Queues Celery task: `tailor_resume_for_job.delay(user_id, job_id)`

#### B. From Custom Posting (via `/resumes/tailor-from-posting`)
- User pastes job description in "Tailor CV" form
- Frontend calls `POST /api/resumes/tailor-from-posting`
- Processes immediately (synchronous)

---

### 2. **Parse Base Resume**
**File**: `backend/app/api/resumes.py` (lines 74-109)

1. Fetch user's base resume (where `is_base=True`)
2. If `parsed_json` exists, use it
3. Otherwise, extract text from PDF/DOCX using:
   - `pdfplumber` for PDFs
   - `python-docx` for DOCX files
4. Call AI service to parse resume text into structured JSON:
   ```python
   resume_json = await ai_service.parse_resume(text_content)
   ```
5. Save `parsed_json` to base resume for future use

**Parsed JSON Structure**:
```json
{
  "personal_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "location": "San Francisco, CA"
  },
  "summary": "Experienced software engineer...",
  "experience": [
    {
      "title": "Senior Engineer",
      "company": "Tech Corp",
      "start_date": "2020-01",
      "end_date": "2024-01",
      "current": false,
      "achievements": ["Built scalable systems...", "Led team of 5..."]
    }
  ],
  "education": [...],
  "skills": ["Python", "FastAPI", "React", ...],
  "projects": [...]
}
```

---

### 3. **Analyze Match (Job Card Only)**
**File**: `backend/workers/tailoring.py` (lines 118-130)

Only for job-based tailoring, AI analyzes the match between resume and job:

```python
match_analysis = await ai_service.analyze_match_for_job_tailoring(
    resume_json,
    job_title=job.title,
    company=job.company,
    location=job.location,
    job_description=job.description,
    required_skills=job.required_skills,
)
```

**Match Analysis Output**:
```json
{
  "match_score": 85,
  "recommended": true,
  "strengths": ["Strong Python experience", "Relevant project work"],
  "concerns": ["Limited cloud experience"],
  "matched_skills": ["Python", "FastAPI", "PostgreSQL"],
  "missing_skills": ["AWS", "Kubernetes"],
  "match_reasons": ["5 years experience matches senior role"]
}
```

---

### 4. **Tailor Resume Content**
**File**: `backend/workers/tailoring.py` (lines 133-145)

AI modifies resume content to align with job requirements:

```python
tailored_json = await ai_service.tailor_resume_json_for_job(
    resume_json,
    match_analysis,
    job_title=job.title,
    company=job.company,
    location=job.location,
    job_description=job.description,
    required_skills=job.required_skills,
)
```

**What Changes**:
- Summary rewritten to emphasize relevant experience
- Experience bullet points reordered/rewritten to highlight matching skills
- Skills section reordered to put required skills first
- Projects filtered to show most relevant ones
- Keywords from job description incorporated naturally

---

### 5. **Generate LaTeX Code**
**File**: `backend/app/services/resume_pdf.py` (lines 11-25)

AI converts tailored JSON to professional LaTeX document:

```python
tex = await ai_service.resume_json_to_latex_document(tailored_json)
```

**LaTeX Generation**:
- Uses professional CV templates (moderncv, article class, or custom)
- Proper formatting with sections, bullet points, dates
- Clean typography and layout
- ATS-friendly structure

**Example LaTeX Output**:
```latex
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{geometry}
\geometry{margin=1in}

\begin{document}

\begin{center}
{\LARGE \textbf{John Doe}}\\
\vspace{2mm}
john@example.com | +1234567890 | San Francisco, CA
\end{center}

\section*{Professional Summary}
Experienced software engineer with 5+ years building scalable backend systems...

\section*{Experience}
\textbf{Senior Engineer} — Tech Corp \hfill Jan 2020 – Jan 2024
\begin{itemize}
  \item Built scalable microservices handling 1M+ requests/day
  \item Led team of 5 engineers in migrating legacy systems
\end{itemize}
...
\end{document}
```

---

### 6. **Compile LaTeX to PDF**
**File**: `backend/app/services/resume_latex.py`

Uses `pdflatex` to compile LaTeX to PDF:

```python
pdf_path = compile_latex_to_pdf(tex)
```

**Fallback**: If LaTeX compilation fails, uses HTML+WeasyPrint:
- Generates HTML from JSON
- Converts HTML to PDF using WeasyPrint

---

### 7. **Save PDF to Database**
**Updated Files**: 
- `backend/workers/tailoring.py` (lines 147-174)
- `backend/app/api/resumes.py` (lines 139-163)

1. Save PDF file to permanent location:
   ```
   uploads/resumes/{user_id}/{resume_id}.pdf
   ```

2. Create Resume record in database:
   ```python
   tailored_resume = Resume(
       user_id=current_user.id,
       version_name=f"Tailored for {job.title} at {job.company}",
       is_base=False,
       parsed_json=tailored_json,  # Structured content
       file_path=file_path,        # PDF file path
       original_filename=base_resume.original_filename,
   )
   db.add(tailored_resume)
   ```

3. Link to Application (job card flow):
   ```python
   application.tailored_resume_id = tailored_resume.id
   application.status = "cv_emailed"
   ```

---

### 8. **Send Email to User**
**File**: `backend/workers/notifications.py` (lines 145-225)

Email includes:
1. **Subject**: "Your tailored CV for {Job Title} at {Company}"
2. **Body**:
   - Job details (title, company, location)
   - Match score (if available)
   - Apply link (if available)
   - Confirmation link to mark as applied
3. **Attachment**: `CV_{Company}_{JobTitle}.pdf`

**Email Service**: `app.services.email.service.EmailService`
- Uses SendGrid for email delivery
- Template-based HTML emails
- Proper MIME multipart for attachments

---

## Database Schema

### Resume Model
```python
class Resume(Base):
    id: UUID
    user_id: UUID
    version_name: str  # "Tailored for Senior Engineer at Google"
    is_base: bool      # False for tailored resumes
    parsed_json: dict  # Structured resume content
    file_path: str     # "uploads/resumes/{user_id}/{id}.pdf"
    original_filename: str
    created_at: datetime
    updated_at: datetime
```

### Application Model
```python
class Application(Base):
    id: UUID
    user_id: UUID
    job_id: UUID
    resume_id: UUID               # Base resume
    tailored_resume_id: UUID      # Generated tailored resume
    match_score: int              # 0-100
    match_analysis: dict          # AI match analysis
    status: str                   # cv_preparing, cv_emailed, applied, etc.
    created_at: datetime
```

---

## AI Service Methods

### 1. `parse_resume(text: str) -> dict`
Extracts structured data from raw resume text.

### 2. `analyze_match_for_job_tailoring(resume_json, job_details) -> dict`
Scores resume against job and provides match analysis.

### 3. `tailor_resume_json_for_job(resume_json, match_analysis, job_details) -> dict`
Rewrites resume content to emphasize relevant experience.

### 4. `resume_json_to_latex_document(resume_json) -> str`
Generates professional LaTeX code from structured resume.

---

## Error Handling

### Base Resume Missing
```json
{
  "status_code": 400,
  "detail": "Upload a base resume first so we can tailor it."
}
```

### PDF Extraction Failed
```json
{
  "status_code": 400,
  "detail": "Could not extract content from base resume. The PDF may be corrupted or empty."
}
```

### AI Service Errors
- `analyze_match_for_job_tailoring` fails → Application marked as `failed`
- `tailor_resume_json_for_job` fails → Application marked as `failed`
- LaTeX compilation fails → Falls back to HTML/WeasyPrint

### Worker Retries
All Celery tasks configured with:
- `max_retries=2` (tailoring) or `max_retries=3` (email)
- `default_retry_delay=60` seconds
- `acks_late=True` for reliability

---

## Testing the Flow

### 1. Upload Base Resume
```bash
curl -X POST http://localhost:8000/api/resumes/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@resume.pdf"
```

### 2. Tailor from Job Card
```bash
curl -X POST http://localhost:8000/api/jobs/{job_id}/tailor-and-email \
  -H "Authorization: Bearer {token}"
```

### 3. Tailor from Custom Posting
```bash
curl -X POST http://localhost:8000/api/resumes/tailor-from-posting \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Looking for a senior Python developer...",
    "job_title": "Senior Python Engineer",
    "company": "Tech Corp",
    "email_pdf": true
  }'
```

### 4. Verify Resume Saved
```bash
curl http://localhost:8000/api/resumes \
  -H "Authorization: Bearer {token}"
```

### 5. Download Tailored PDF
```bash
curl http://localhost:8000/api/resumes/{resume_id}/file \
  -H "Authorization: Bearer {token}" \
  -o tailored_resume.pdf
```

---

## Performance Considerations

1. **Async Processing**: Job-based tailoring uses Celery workers
2. **PDF Caching**: Tailored PDFs saved to disk to avoid regeneration
3. **AI Rate Limiting**: Exponential backoff on AI service errors
4. **Temp File Cleanup**: PDF temp files cleaned up after processing
5. **Database Indexing**: Indexes on `user_id`, `job_id`, `is_base`

---

## Future Enhancements

1. **Multiple Templates**: Allow users to choose CV templates
2. **A/B Testing**: Generate multiple versions and compare
3. **Cover Letter**: Generate matching cover letters
4. **Version History**: Track all tailored versions per job
5. **Bulk Tailoring**: Queue multiple jobs at once
