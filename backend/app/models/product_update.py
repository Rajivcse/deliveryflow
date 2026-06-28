import enum
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
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


class ProductUpdateStatus(str, enum.Enum):
    planned = "planned"
    development = "development"
    testing = "testing"
    deployment = "deployment"
    blocked = "blocked"
    completed = "completed"


class ProductUpdate(Base):
    __tablename__ = "product_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    update_name: Mapped[str] = mapped_column(String(300), nullable=False)
    version_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    product: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    assigned_to_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    planned_release_date: Mapped[Optional[date]] = mapped_column(Date, index=True, nullable=True)
    status: Mapped[ProductUpdateStatus] = mapped_column(
        Enum(ProductUpdateStatus, name="productupdatestatus"),
        nullable=False,
        default=ProductUpdateStatus.planned,
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
    comments: Mapped[List["ProductUpdateComment"]] = relationship(
        "ProductUpdateComment", back_populates="product_update", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_product_update_status_release_date", "status", "planned_release_date"),
    )


class ProductUpdateComment(Base):
    __tablename__ = "product_update_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_update_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("product_updates.id", ondelete="CASCADE"),
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
    product_update: Mapped["ProductUpdate"] = relationship(
        "ProductUpdate", back_populates="comments"
    )
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])  # noqa: F821
