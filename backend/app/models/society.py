import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database import Base


class Society(Base):
    __tablename__ = "societies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False, unique=True, index=True)
    address = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

