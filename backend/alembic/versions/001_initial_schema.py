"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-28 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # Enum types                                                           #
    # ------------------------------------------------------------------ #
    userrole_enum = sa.Enum(
        "delivery_manager", "product_manager", "admin",
        name="userrole",
    )
    implementationstatus_enum = sa.Enum(
        "not_started", "in_progress", "waiting_for_venue",
        "waiting_for_internal_team", "blocked", "completed",
        name="implementationstatus",
    )
    crsource_enum = sa.Enum(
        "venue_request", "support_team_request",
        name="crsource",
    )
    priority_enum = sa.Enum(
        "high", "medium", "low",
        name="priority",
    )
    crstatus_enum = sa.Enum(
        "new", "analysis", "in_progress", "testing",
        "waiting_for_review", "blocked", "completed", "delayed",
        name="crstatus",
    )
    productupdatestatus_enum = sa.Enum(
        "planned", "development", "testing", "deployment", "blocked", "completed",
        name="productupdatestatus",
    )
    notificationtype_enum = sa.Enum(
        "new_assignment", "item_blocked", "item_delayed", "target_date_exceeded",
        name="notificationtype",
    )
    itemtype_enum = sa.Enum(
        "implementation", "change_request", "product_update",
        name="itemtype",
    )

    # ------------------------------------------------------------------ #
    # 1. users                                                             #
    # ------------------------------------------------------------------ #
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("role", userrole_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ------------------------------------------------------------------ #
    # 2. refresh_tokens                                                    #
    # ------------------------------------------------------------------ #
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(500), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_refresh_tokens_id", "refresh_tokens", ["id"])
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token", "refresh_tokens", ["token"], unique=True)

    # ------------------------------------------------------------------ #
    # 3. venue_implementations                                             #
    # ------------------------------------------------------------------ #
    op.create_table(
        "venue_implementations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("iwo_number", sa.String(50), nullable=False),
        sa.Column("venue_name", sa.String(200), nullable=False),
        sa.Column("product_name", sa.String(200), nullable=False),
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("status", implementationstatus_enum, nullable=False, server_default="not_started"),
        sa.Column(
            "last_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_venue_implementations_id", "venue_implementations", ["id"])
    op.create_index("ix_venue_implementations_iwo_number", "venue_implementations", ["iwo_number"], unique=True)
    op.create_index("ix_venue_implementations_venue_name", "venue_implementations", ["venue_name"])
    op.create_index("ix_venue_implementations_target_date", "venue_implementations", ["target_date"])
    op.create_index("ix_venue_implementations_last_updated_at", "venue_implementations", ["last_updated_at"])
    op.create_index(
        "ix_venue_impl_status_target_date",
        "venue_implementations",
        ["status", "target_date"],
    )

    # ------------------------------------------------------------------ #
    # 4. implementation_comments                                           #
    # ------------------------------------------------------------------ #
    op.create_table(
        "implementation_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("implementation_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["implementation_id"], ["venue_implementations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_implementation_comments_id", "implementation_comments", ["id"])
    op.create_index(
        "ix_implementation_comments_implementation_id",
        "implementation_comments",
        ["implementation_id"],
    )

    # ------------------------------------------------------------------ #
    # 5. change_requests                                                   #
    # ------------------------------------------------------------------ #
    op.create_table(
        "change_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cr_number", sa.String(50), nullable=False),
        sa.Column("venue_name", sa.String(200), nullable=True),
        sa.Column("product", sa.String(200), nullable=False),
        sa.Column("request_title", sa.String(300), nullable=False),
        sa.Column("requested_by", sa.String(200), nullable=False),
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("source", crsource_enum, nullable=False),
        sa.Column("priority", priority_enum, nullable=False, server_default="medium"),
        sa.Column("status", crstatus_enum, nullable=False, server_default="new"),
        sa.Column(
            "last_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_change_requests_id", "change_requests", ["id"])
    op.create_index("ix_change_requests_cr_number", "change_requests", ["cr_number"], unique=True)
    op.create_index("ix_change_requests_venue_name", "change_requests", ["venue_name"])
    op.create_index("ix_change_requests_product", "change_requests", ["product"])
    op.create_index("ix_change_requests_last_updated_at", "change_requests", ["last_updated_at"])
    op.create_index(
        "ix_change_request_status_product",
        "change_requests",
        ["status", "product"],
    )

    # ------------------------------------------------------------------ #
    # 6. change_request_comments                                           #
    # ------------------------------------------------------------------ #
    op.create_table(
        "change_request_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("change_request_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["change_request_id"], ["change_requests.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_change_request_comments_id", "change_request_comments", ["id"])
    op.create_index(
        "ix_change_request_comments_change_request_id",
        "change_request_comments",
        ["change_request_id"],
    )

    # ------------------------------------------------------------------ #
    # 7. product_updates                                                   #
    # ------------------------------------------------------------------ #
    op.create_table(
        "product_updates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("update_name", sa.String(300), nullable=False),
        sa.Column("version_number", sa.String(50), nullable=True),
        sa.Column("product", sa.String(200), nullable=False),
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("planned_release_date", sa.Date(), nullable=True),
        sa.Column(
            "status", productupdatestatus_enum, nullable=False, server_default="planned"
        ),
        sa.Column(
            "last_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_updates_id", "product_updates", ["id"])
    op.create_index("ix_product_updates_product", "product_updates", ["product"])
    op.create_index("ix_product_updates_planned_release_date", "product_updates", ["planned_release_date"])
    op.create_index("ix_product_updates_last_updated_at", "product_updates", ["last_updated_at"])
    op.create_index(
        "ix_product_update_status_release_date",
        "product_updates",
        ["status", "planned_release_date"],
    )

    # ------------------------------------------------------------------ #
    # 8. product_update_comments                                           #
    # ------------------------------------------------------------------ #
    op.create_table(
        "product_update_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_update_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["product_update_id"], ["product_updates.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_update_comments_id", "product_update_comments", ["id"])
    op.create_index(
        "ix_product_update_comments_product_update_id",
        "product_update_comments",
        ["product_update_id"],
    )

    # ------------------------------------------------------------------ #
    # 9. notifications                                                     #
    # ------------------------------------------------------------------ #
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("type", notificationtype_enum, nullable=False),
        sa.Column("item_type", itemtype_enum, nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])


def downgrade() -> None:
    # Drop tables in reverse FK order
    op.drop_table("notifications")
    op.drop_table("product_update_comments")
    op.drop_table("product_updates")
    op.drop_table("change_request_comments")
    op.drop_table("change_requests")
    op.drop_table("implementation_comments")
    op.drop_table("venue_implementations")
    op.drop_table("refresh_tokens")
    op.drop_table("users")

    # Drop enum types
    sa.Enum(name="itemtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="notificationtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="productupdatestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="crstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="priority").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="crsource").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="implementationstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
