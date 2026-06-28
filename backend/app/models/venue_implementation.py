import enum
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Date,
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


class ImplementationStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    waiting_for_venue = "waiting_for_venue"
    waiting_for_internal_team = "waiting_for_internal_team"
    blocked = "blocked"
    completed = "completed"


class VenueImplementation(Base):
    __tablename__ = "venue_implementations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    iwo_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    venue_name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    assigned_to_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    target_date: Mapped[Optional[date]] = mapped_column(Date, index=True, nullable=True)
    status: Mapped[ImplementationStatus] = mapped_column(
        Enum(ImplementationStatus, name="implementationstatus"),
        nullable=False,
        default=ImplementationStatus.not_started,
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
    comments: Mapped[List["ImplementationComment"]] = relationship(
        "ImplementationComment", back_populates="implementation", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_venue_impl_status_target_date", "status", "target_date"),
    )


class ImplementationComment(Base):
    __tablename__ = "implementation_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    implementation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("venue_implementations.id", ondelete="CASCADE"),
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
    implementation: Mapped["VenueImplementation"] = relationship(
        "VenueImplementation", back_populates="comments"
    )
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])  # noqa: F821
