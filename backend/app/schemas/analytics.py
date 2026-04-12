from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_applications: int = 0
    pending_approval: int = 0
    cv_emailed: int = 0
    approved: int = 0
    submitted: int = 0
    rejected: int = 0
    expired: int = 0
    average_match_score: float = 0.0
    approval_rate: float = 0.0
    submission_success_rate: float = 0.0


class ApplicationsOverTime(BaseModel):
    date: str
    count: int


class StatusDistribution(BaseModel):
    status: str
    count: int
    percentage: float


class TopSkills(BaseModel):
    skill: str
    count: int
    match_rate: float


class MatchScoreHistogram(BaseModel):
    range_label: str
    count: int
