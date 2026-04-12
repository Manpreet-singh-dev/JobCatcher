import hashlib
import logging
import random
import time
from abc import ABC, abstractmethod
from collections import deque
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


class RateLimiter:
    """Sliding-window rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._timestamps: deque[float] = deque()

    def _evict_old(self):
        cutoff = time.monotonic() - self.window_seconds
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.popleft()

    def acquire(self) -> bool:
        self._evict_old()
        if len(self._timestamps) >= self.max_requests:
            return False
        self._timestamps.append(time.monotonic())
        return True

    def wait(self):
        """Block until a request slot is available."""
        while not self.acquire():
            self._evict_old()
            if self._timestamps:
                sleep_for = self._timestamps[0] + self.window_seconds - time.monotonic() + 0.5
                time.sleep(max(sleep_for, 1.0))
            else:
                break


class BaseJobScraper(ABC):
    """Abstract base for job data providers."""

    SOURCE_NAME: str = "unknown"
    MAX_REQUESTS_PER_HOUR: int = 60
    MIN_DELAY: float = 0.5
    MAX_DELAY: float = 2.0

    def __init__(self):
        self._rate_limiter = RateLimiter(
            max_requests=self.MAX_REQUESTS_PER_HOUR,
            window_seconds=3600,
        )

    def search(self, query_params: dict[str, Any]) -> list[dict[str, Any]]:
        """Run a search and return normalised job dicts."""
        try:
            raw_results = self._execute_search(query_params)
            normalised: list[dict[str, Any]] = []
            for raw in raw_results:
                try:
                    job = self._normalize_job(raw)
                    if job and job.get("title") and job.get("company"):
                        job["dedup_hash"] = self._dedup_hash(job)
                        normalised.append(job)
                except Exception:
                    logger.warning(
                        "Failed to normalise a %s result", self.SOURCE_NAME, exc_info=True
                    )
            logger.info(
                "%s: %d raw results -> %d normalised jobs",
                self.SOURCE_NAME,
                len(raw_results),
                len(normalised),
            )
            return normalised
        except Exception:
            logger.error("%s search failed", self.SOURCE_NAME, exc_info=True)
            return []

    @abstractmethod
    def _execute_search(self, query_params: dict[str, Any]) -> list[Any]:
        """Perform the actual API requests and return raw result objects."""

    @abstractmethod
    def _normalize_job(self, raw_data: Any) -> dict[str, Any]:
        """Convert a raw API-specific result into the canonical dict."""

    @abstractmethod
    def _build_search_url(self, preferences: dict[str, Any]) -> str:
        """Build the search URL from user preferences."""

    def _random_delay(self):
        delay = random.uniform(self.MIN_DELAY, self.MAX_DELAY)
        time.sleep(delay)

    def _wait_for_rate_limit(self):
        self._rate_limiter.wait()

    @staticmethod
    def _dedup_hash(job: dict[str, Any]) -> str:
        """SHA-256 of normalised (company + title + location)."""
        company = (job.get("company") or "").strip().lower()
        title = (job.get("title") or "").strip().lower()
        location = (job.get("location") or "").strip().lower()
        raw = f"{company}|{title}|{location}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _now_utc() -> str:
        return datetime.now(timezone.utc).isoformat()
