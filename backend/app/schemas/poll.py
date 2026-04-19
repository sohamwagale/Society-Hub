# Import Pydantic's BaseModel for data validation and schema definition
from pydantic import BaseModel
# Import Optional and List for type hinting nullable fields and collections
from typing import Optional, List
# Import datetime for handling timestamp and deadline fields
from datetime import datetime


# Schema for creating a single choice option within a poll
class PollOptionCreate(BaseModel):
    # The display text of the voting option (e.g., 'Yes')
    text: str


# Schema for returning poll option information via the API
class PollOptionOut(BaseModel):
    # Unique ID of the option record
    id: str
    # The text description of the option
    text: str
    # The current running total of votes for this specific option, defaults to 0
    vote_count: int = 0

    # enable SQLAlchemy model mapping
    class Config:
        from_attributes = True


# Schema for creating a new community poll
class PollCreate(BaseModel):
    # The main question or title of the poll
    title: str
    # Optional context or background info for the poll
    description: Optional[str] = None
    # The deadline date and time for when voting will close
    deadline: datetime
    # List of options (as PollOptionCreate objects) residents can choose from
    options: List[PollOptionCreate]


# Schema for returning poll overview information via the API
class PollOut(BaseModel):
    # Unique ID of the poll record
    id: str
    # Title of the poll
    title: str
    # Optional description of the poll
    description: Optional[str] = None
    # ID of the user who created the poll
    created_by: str
    # Voting deadline timestamp
    deadline: datetime
    # Flag indicating if the poll is currently open for voting
    is_active: bool
    # Timestamp of when the poll was record was created
    created_at: datetime
    # List of options associated with this poll, defaults to empty
    options: List[PollOptionOut] = []
    # Computed flag (per-user) indicating if the requesting user has already voted
    user_voted: Optional[bool] = None

    # Enable SQLAlchemy to Pydantic conversion
    class Config:
        from_attributes = True


# Schema for submitting a new vote to a specific poll option
class VoteCreate(BaseModel):
    # The ID of the option the user is voting for
    option_id: str


# Schema for returning vote record information via the API
class VoteOut(BaseModel):
    # Unique ID of the vote record
    id: str
    # ID of the parent poll
    poll_id: str
    # ID of the selected poll option
    option_id: str
    # ID of the user who cast the vote
    user_id: str
    # Timestamp of when the vote was recorded
    voted_at: datetime

    # enable SQLAlchemy model mapping
    class Config:
        from_attributes = True

