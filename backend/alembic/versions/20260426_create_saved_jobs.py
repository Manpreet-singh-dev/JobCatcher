"""create saved_jobs table

Revision ID: 20260426_saved
Revises: 20260413_conf
Create Date: 2026-04-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from alembic import op

revision: str = "20260426_saved"
down_revision: Union[str, None] = "20260413_conf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_job_id", sa.String(255), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("company", sa.String(255), nullable=False),
        sa.Column("company_logo_url", sa.Text, nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("work_mode", sa.String(50), nullable=True),
        sa.Column("employment_type", sa.String(50), nullable=True),
        sa.Column("salary_min", sa.Integer, nullable=True),
        sa.Column("salary_max", sa.Integer, nullable=True),
        sa.Column("salary_currency", sa.String(10), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("required_skills", ARRAY(sa.String), nullable=True),
        sa.Column("preferred_skills", ARRAY(sa.String), nullable=True),
        sa.Column("experience_required", sa.String(100), nullable=True),
        sa.Column("apply_url", sa.Text, nullable=True),
        sa.Column("posted_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "saved_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_saved_jobs_user_id", "saved_jobs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_saved_jobs_user_id", table_name="saved_jobs")
    op.drop_table("saved_jobs")
