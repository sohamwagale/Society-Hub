import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Flat(Base):
    __tablename__ = "flats"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    flat_number = Column(String(10), nullable=False)
    block = Column(String(10), nullable=False, default="A")
    floor = Column(String(5), nullable=False, default="1")
    created_at = Column(DateTime, default=datetime.utcnow)

    # New relations
    society_id = Column(String, ForeignKey("societies.id"), nullable=True)
    owner_user_id = Column(String, ForeignKey("users.id"), nullable=True)

    residents = relationship("User", back_populates="flat", foreign_keys="[User.flat_id]")
