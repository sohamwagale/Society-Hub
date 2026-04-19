# Import uuid for generating unique identifiers for polls, options, and votes
import uuid
# Import datetime for timestamping poll creation and interaction
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Boolean, Integer, Text
# Import relationship to link polls to options, votes, and users
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base


# Model representing a community poll or voting session
class Poll(Base):
    # Set the name of the database table
    __tablename__ = "polls"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the Society where the poll is conducted
    society_id = Column(String, ForeignKey("societies.id"), nullable=True, index=True)
    # The title or question of the poll
    title = Column(String(200), nullable=False)
    # Optional detailed explanation or context for the poll
    description = Column(Text, nullable=True)
    # Foreign key link to the admin/user who created the poll
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    # The date and time when the poll will close for voting
    deadline = Column(DateTime, nullable=False)
    # Flag to manually toggle the poll's visibility/active status
    is_active = Column(Boolean, default=True)
    # Timestamp of when the poll record was created
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to access the user details of the poll creator
    creator = relationship("User", foreign_keys=[created_by])
    # Relationship to the available options within this poll (cascades delete)
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan")
    # Relationship to all votes cast in this poll (cascades delete)
    votes = relationship("Vote", back_populates="poll", cascade="all, delete-orphan")


# Model representing an individual choice/option within a poll
class PollOption(Base):
    # Set the name of the database table
    __tablename__ = "poll_options"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key linking this option back to its parent Poll
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False)
    # The text description of the option (e.g., "Yes", "No", "Maybe")
    text = Column(String(300), nullable=False)
    # Counter for the number of votes this specific option has received
    vote_count = Column(Integer, default=0)

    # Bidirectional relationship back to the Poll model
    poll = relationship("Poll", back_populates="options")


# Model representing a single vote cast by a user on a specific poll option
class Vote(Base):
    # Set the name of the database table
    __tablename__ = "votes"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key linking the vote to the overall Poll
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False)
    # Foreign key linking the vote to the specific Option chosen
    option_id = Column(String, ForeignKey("poll_options.id"), nullable=False)
    # Foreign key linking the vote to the User who cast it
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # Timestamp of when the vote was recorded
    voted_at = Column(DateTime, default=datetime.utcnow)

    # Bidirectional relationship back to the Poll model
    poll = relationship("Poll", back_populates="votes")
    # Relationship to access the details of the selected PollOption
    option = relationship("PollOption")
    # Relationship to access the details of the User who voted
    user = relationship("User")

