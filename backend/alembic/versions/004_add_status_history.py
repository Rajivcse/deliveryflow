"""add status_history table

Revision ID: 004
Revises: 003
Create Date: 2026-06-29
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "status_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("item_type", sa.String(50), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("old_status", sa.String(50), nullable=False),
        sa.Column("new_status", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("changed_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["changed_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_status_history_id", "status_history", ["id"])
    op.create_index(
        "ix_status_history_item_type_id",
        "status_history",
        ["item_type", "item_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_status_history_item_type_id", table_name="status_history")
    op.drop_index("ix_status_history_id", table_name="status_history")
    op.drop_table("status_history")
