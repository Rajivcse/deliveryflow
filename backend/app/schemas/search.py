from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal, Union


class SearchResultBase(BaseModel):
    id: int
    item_type: Literal["implementation", "change_request", "product_update"]
    title: str
    status: str
    last_updated_at: datetime
    created_at: datetime
    assigned_to_name: Optional[str] = None


class ImplementationSearchResult(SearchResultBase):
    item_type: Literal["implementation"] = "implementation"
    iwo_number: str
    venue_name: str


class ChangeRequestSearchResult(SearchResultBase):
    item_type: Literal["change_request"] = "change_request"
    cr_number: str
    priority: str


class ProductUpdateSearchResult(SearchResultBase):
    item_type: Literal["product_update"] = "product_update"
    product: str
    version_number: Optional[str]


SearchResult = Union[
    ImplementationSearchResult,
    ChangeRequestSearchResult,
    ProductUpdateSearchResult,
]
