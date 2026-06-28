"""Test data factories — create ORM objects directly without HTTP."""
import secrets
from datetime import date, datetime, timedelta, timezone

from app.models.change_request import CRSource, CRStatus, ChangeRequest, ChangeRequestComment, Priority
from app.models.notification import Notification, NotificationType, ItemType
from app.models.product_update import ProductUpdate, ProductUpdateComment, ProductUpdateStatus
from app.models.user import User, UserRole
from app.models.venue_implementation import ImplementationStatus, VenueImplementation


def make_user(
    db,
    role: UserRole = UserRole.delivery_manager,
    email: str | None = None,
    suffix: str = "",
) -> User:
    tag = suffix or secrets.token_hex(4)
    u = User(
        email=email or f"test_{tag}@example.com",
        full_name=f"Test User {tag}",
        role=role,
        is_active=True,
    )
    db.add(u)
    return u


def make_implementation(
    db,
    created_by_id: int,
    assigned_to_id: int,
    status: ImplementationStatus = ImplementationStatus.in_progress,
    iwo_number: str | None = None,
    target_date: date | None = None,
    last_updated_at: datetime | None = None,
) -> VenueImplementation:
    item = VenueImplementation(
        iwo_number=iwo_number or f"IWO-{secrets.token_hex(4).upper()}",
        venue_name="Test Venue",
        product_name="Test Product",
        assigned_to_id=assigned_to_id,
        created_by_id=created_by_id,
        start_date=date.today(),
        target_date=target_date or date.today() + timedelta(days=30),
        status=status,
        last_updated_at=last_updated_at or datetime.now(timezone.utc),
    )
    db.add(item)
    return item


def make_cr(
    db,
    created_by_id: int,
    assigned_to_id: int,
    status: CRStatus = CRStatus.new,
    priority: Priority = Priority.medium,
    cr_number: str | None = None,
) -> ChangeRequest:
    cr = ChangeRequest(
        cr_number=cr_number or f"CR-{secrets.token_hex(4).upper()}",
        venue_name="Test Venue",
        product="Test Product",
        request_title="Test CR Title",
        requested_by="Requester",
        assigned_to_id=assigned_to_id,
        created_by_id=created_by_id,
        source=CRSource.venue_request,
        priority=priority,
        status=status,
        last_updated_at=datetime.now(timezone.utc),
    )
    db.add(cr)
    return cr


def make_product_update(
    db,
    created_by_id: int,
    assigned_to_id: int,
    status: ProductUpdateStatus = ProductUpdateStatus.development,
    planned_release_date: date | None = None,
) -> ProductUpdate:
    pu = ProductUpdate(
        update_name="Test Update",
        version_number="1.0.0",
        product="Member Services",
        assigned_to_id=assigned_to_id,
        created_by_id=created_by_id,
        start_date=date.today(),
        planned_release_date=planned_release_date or date.today() + timedelta(days=30),
        status=status,
        last_updated_at=datetime.now(timezone.utc),
    )
    db.add(pu)
    return pu


def make_notification(
    db,
    user_id: int,
    item_id: int = 1,
    notification_type: NotificationType = NotificationType.new_assignment,
    item_type: ItemType = ItemType.implementation,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=notification_type,
        item_type=item_type,
        item_id=item_id,
        message="Test notification",
        is_read=False,
    )
    db.add(n)
    return n
