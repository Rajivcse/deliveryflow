"""Add notes column to all three work item tables

Revision ID: 002
Revises: 001
Create Date: 2026-06-29 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("venue_implementations", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("change_requests", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("product_updates", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("venue_implementations", "notes")
    op.drop_column("change_requests", "notes")
    op.drop_column("product_updates", "notes")
