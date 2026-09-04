from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter()


@router.put("/{user_id}/committee")
def set_committee_role(
    user_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    if admin.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_committee = payload.get("is_committee", False)
    user.committee_role = payload.get("committee_role", None)
    db.commit()
    return {"detail": "Committee role updated"}
