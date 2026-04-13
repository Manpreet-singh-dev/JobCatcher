"""Compile AI-generated LaTeX into a PDF (Tectonic preferred, pdflatex fallback)."""

import logging
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

_BLOCKED = (
    r"\\write18",
    r"\\immediate\s*\\write18",
    r"\\input\s*\{",
    r"\\include\s*\{",
    r"shell\s*escape",
)


def strip_latex_fences(text: str) -> str:
    t = text.strip()
    if not t.startswith("```"):
        return t
    lines = t.split("\n")
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    while lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _latex_looks_safe(tex: str) -> bool:
    t = tex.replace(" ", "").lower()
    for pat in _BLOCKED:
        if re.search(pat, t, re.IGNORECASE):
            logger.warning("LaTeX rejected: matched blocked pattern %s", pat)
            return False
    return True


def compile_latex_to_pdf(tex_source: str, *, timeout_sec: int = 120) -> Path | None:
    """Write LaTeX to a temp dir and run ``tectonic`` or ``pdflatex``. Returns path to PDF or None."""
    tex = strip_latex_fences(tex_source.strip())
    if "\\documentclass" not in tex or "\\end{document}" not in tex:
        logger.error("LaTeX missing \\documentclass or \\end{document}")
        return None
    if not _latex_looks_safe(tex):
        return None

    tectonic = shutil.which("tectonic")
    pdflatex = shutil.which("pdflatex")
    if not tectonic and not pdflatex:
        logger.warning("No tectonic or pdflatex on PATH — cannot compile LaTeX to PDF")
        return None

    tmpdir = Path(tempfile.mkdtemp(prefix="jc_resume_tex_"))
    tex_path = tmpdir / "resume.tex"
    try:
        tex_path.write_text(tex, encoding="utf-8")
        cmd: list[str]
        if tectonic:
            cmd = [tectonic, str(tex_path)]
        else:
            assert pdflatex is not None
            cmd = [
                pdflatex,
                "-interaction=nonstopmode",
                "-halt-on-error",
                str(tex_path.name),
            ]

        proc = subprocess.run(
            cmd,
            cwd=str(tmpdir),
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
        pdf_path = tmpdir / "resume.pdf"
        if proc.returncode != 0:
            logger.error(
                "LaTeX compile failed rc=%s cmd=%s stderr=%s",
                proc.returncode,
                cmd,
                (proc.stderr or "")[-4000:],
            )
            return None
        if not pdf_path.is_file():
            logger.error("LaTeX compile produced no resume.pdf")
            return None

        out = Path(tempfile.mktemp(suffix=".pdf", prefix="resume_latex_"))
        out.write_bytes(pdf_path.read_bytes())
        return out
    except subprocess.TimeoutExpired:
        logger.error("LaTeX compile timed out after %s s", timeout_sec)
        return None
    except Exception:
        logger.exception("LaTeX compile failed")
        return None
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
