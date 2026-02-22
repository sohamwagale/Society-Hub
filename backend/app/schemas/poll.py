from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PollOptionCreate(BaseModel):
    text: str


class PollOptionOut(BaseModel):
    id: str
    text: str
    vote_count: int = 0

    class Config:
        from_attributes = True


class PollCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    options: List[PollOptionCreate]


class PollOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    created_by: str
    deadline: datetime
    is_active: bool
    created_at: datetime
    options: List[PollOptionOut] = []
    user_voted: Optional[bool] = None

    class Config:
        from_attributes = True


class VoteCreate(BaseModel):
    option_id: str


class VoteOut(BaseModel):
    id: str
    poll_id: str
    option_id: str
    user_id: str
    voted_at: datetime

    class Config:
        from_attributes = True
