import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.flat import Flat
from app.models.society import Society
from app.schemas.onboarding import CreateSocietyRequest
from app.core.deps import get_current_user

router = APIRouter()


@router.post("/create-society", status_code=status.HTTP_201_CREATED)
def create_society(
    data: CreateSocietyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.society_id:
        raise HTTPException(status_code=400, detail="You already belong to an existing society")

    society = Society(
        id=str(uuid.uuid4()),
        name=data.society_name,
        address=data.society_address,
    )
    db.add(society)

    for f in data.flats:
        flat = Flat(
            id=str(uuid.uuid4()),
            flat_number=f.flat_number,
            block=f.block,
            floor=f.floor,
            society_id=society.id,
        )
        db.add(flat)

    current_user.role = UserRole.ADMIN
    current_user.society_id = society.id
    current_user.is_approved = True
    current_user.is_approved_by_admin = True

    db.commit()
    db.refresh(current_user)
    db.refresh(society)

    return {
        "detail": "Society and flats created successfully. You are now the administrator.",
        "society_id": society.id,
        "flats_created": len(data.flats),
    }
