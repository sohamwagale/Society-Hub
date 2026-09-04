from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.poll import Poll, Vote
from app.core.deps import require_role

router = APIRouter()


@router.put("/{poll_id}/close")
def close_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    poll.is_active = False
    db.commit()
    return {"detail": "Poll successfully closed to further voting"}


@router.delete("/{poll_id}")
def delete_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    vote_count = db.query(Vote).filter(Vote.poll_id == poll_id).count()
    if vote_count > 0:
        raise HTTPException(status_code=400, detail="Integrity error: Cannot delete a poll that contains active voting records")

    for opt in poll.options:
        db.delete(opt)

    db.delete(poll)
    db.commit()
    return {"detail": "Poll and its choices have been permanently deleted"}
