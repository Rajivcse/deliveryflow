from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.notification import ItemType


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    item_type: Mapped[ItemType] = mapped_column(
        # Reuse the existing itemtype enum already created in the DB
        String(50),
        nullable=False,
        index=True,
    )
    item_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    old_status: Mapped[str] = mapped_column(String(50), nullable=False)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    changed_by: Mapped["User"] = relationship("User", foreign_keys=[changed_by_id])  # noqa: F821

    __table_args__ = (
        Index("ix_status_history_item_type_id", "item_type", "item_id"),
    )
