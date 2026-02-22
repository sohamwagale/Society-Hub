import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Boolean, Integer, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Poll(Base):
    __tablename__ = "polls"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    deadline = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="poll", cascade="all, delete-orphan")


class PollOption(Base):
    __tablename__ = "poll_options"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False)
    text = Column(String(300), nullable=False)
    vote_count = Column(Integer, default=0)

    poll = relationship("Poll", back_populates="options")


class Vote(Base):
    __tablename__ = "votes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False)
    option_id = Column(String, ForeignKey("poll_options.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    voted_at = Column(DateTime, default=datetime.utcnow)

    poll = relationship("Poll", back_populates="votes")
    option = relationship("PollOption")
    user = relationship("User")
