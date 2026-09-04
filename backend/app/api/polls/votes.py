import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.poll import Poll, PollOption, Vote
from app.schemas.poll import VoteCreate, VoteOut
from app.core.deps import get_current_user

router = APIRouter()


@router.post("/{poll_id}/vote", response_model=VoteOut, status_code=201)
def vote_on_poll(
    poll_id: str,
    data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    if not poll.is_active:
        raise HTTPException(status_code=400, detail="This poll is no longer accepting votes")

    if poll.deadline < datetime.utcnow():
        raise HTTPException(status_code=400, detail="The voting window for this poll has closed")

    existing = db.query(Vote).filter(Vote.poll_id == poll_id, Vote.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already participated in this poll")

    option = db.query(PollOption).filter(PollOption.id == data.option_id, PollOption.poll_id == poll_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Invalid voting option selected")

    vote = Vote(
        id=str(uuid.uuid4()),
        poll_id=poll_id,
        option_id=data.option_id,
        user_id=current_user.id,
    )
    db.add(vote)
    option.vote_count += 1
    db.commit()
    db.refresh(vote)
    return vote
