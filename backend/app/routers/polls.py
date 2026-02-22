import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.poll import Poll, PollOption, Vote
from app.schemas.poll import PollCreate, PollOut, PollOptionOut, VoteCreate, VoteOut
from app.utils.auth import get_current_user, require_role
from app.services.notification_service import notify_all_residents
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/polls", tags=["Polls"])


@router.post("", response_model=PollOut, status_code=201)
def create_poll(
    data: PollCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    poll = Poll(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        created_by=admin.id,
        deadline=data.deadline,
        is_active=True,
    )
    db.add(poll)
    db.flush()

    for opt in data.options:
        option = PollOption(id=str(uuid.uuid4()), poll_id=poll.id, text=opt.text)
        db.add(option)

    db.commit()
    db.refresh(poll)

    # Notify all residents
    notify_all_residents(
        db, f"New Poll: {poll.title}",
        f"Vote before {poll.deadline.strftime('%d %b %Y %H:%M')}",
        NotificationType.POLL, poll.id,
    )

    return _poll_to_out(poll, None)


@router.get("", response_model=list[PollOut])
def list_polls(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    polls = db.query(Poll).order_by(Poll.created_at.desc()).all()
    return [_poll_to_out(p, current_user.id, db) for p in polls]


@router.get("/{poll_id}", response_model=PollOut)
def get_poll(poll_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return _poll_to_out(poll, current_user.id, db)


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
        raise HTTPException(status_code=400, detail="Poll is no longer active")
    if poll.deadline < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Voting deadline has passed")

    existing = db.query(Vote).filter(Vote.poll_id == poll_id, Vote.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already voted")

    option = db.query(PollOption).filter(PollOption.id == data.option_id, PollOption.poll_id == poll_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

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


def _poll_to_out(poll: Poll, user_id: str | None, db: Session | None = None) -> PollOut:
    user_voted = None
    if user_id and db:
        vote = db.query(Vote).filter(Vote.poll_id == poll.id, Vote.user_id == user_id).first()
        user_voted = vote is not None

    options = [PollOptionOut(id=o.id, text=o.text, vote_count=o.vote_count) for o in poll.options]
    return PollOut(
        id=poll.id,
        title=poll.title,
        description=poll.description,
        created_by=poll.created_by,
        deadline=poll.deadline,
        is_active=poll.is_active,
        created_at=poll.created_at,
        options=options,
        user_voted=user_voted,
    )


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
    return {"detail": "Poll closed"}


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
        raise HTTPException(status_code=400, detail="Cannot delete a poll with votes")

    for opt in poll.options:
        db.delete(opt)
    db.delete(poll)
    db.commit()
    return {"detail": "Poll deleted"}
