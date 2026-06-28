import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base


class CRSource(str, enum.Enum):
    venue_request = "venue_request"
    support_team_request = "support_team_request"


class Priority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class CRStatus(str, enum.Enum):
    new = "new"
    analysis = "analysis"
    in_progress = "in_progress"
    testing = "testing"
    waiting_for_review = "waiting_for_review"
    blocked = "blocked"
    completed = "completed"
    delayed = "delayed"


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cr_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    venue_name: Mapped[Optional[str]] = mapped_column(String(200), index=True, nullable=True)
    product: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    request_title: Mapped[str] = mapped_column(String(300), nullable=False)
    requested_by: Mapped[str] = mapped_column(String(200), nullable=False)
    assigned_to_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    source: Mapped[CRSource] = mapped_column(
        Enum(CRSource, name="crsource"), nullable=False
    )
    priority: Mapped[Priority] = mapped_column(
        Enum(Priority, name="priority"), nullable=False, default=Priority.medium
    )
    status: Mapped[CRStatus] = mapped_column(
        Enum(CRStatus, name="crstatus"), nullable=False, default=CRStatus.new
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    assigned_to: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User", foreign_keys=[assigned_to_id]
    )
    created_by: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[created_by_id]
    )
    comments: Mapped[List["ChangeRequestComment"]] = relationship(
        "ChangeRequestComment", back_populates="change_request", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_change_request_status_product", "status", "product"),
    )


class ChangeRequestComment(Base):
    __tablename__ = "change_request_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    change_request_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("change_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    change_request: Mapped["ChangeRequest"] = relationship(
        "ChangeRequest", back_populates="comments"
    )
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])  # noqa: F821
