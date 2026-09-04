import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.poll import Poll, PollOption, Vote
from app.schemas.poll import PollCreate, PollOut, PollOptionOut
from app.core.deps import get_current_user, require_role
from app.services.notification_service import notify_all_residents
from app.models.notification import NotificationType

router = APIRouter()


def poll_to_out(poll: Poll, user_id: str | None, db: Session | None = None) -> PollOut:
    """Combines poll data with user-specific context for the UI."""
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


@router.post("/", response_model=PollOut, status_code=201)
def create_poll(
    data: PollCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    poll = Poll(
        id=str(uuid.uuid4()),
        society_id=admin.society_id,
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

    notify_all_residents(
        db, f"New Society Poll: {poll.title}",
        f"Cast your vote before {poll.deadline.strftime('%d %b %Y %H:%M')}",
        NotificationType.POLL, poll.id,
        society_id=admin.society_id,
    )
    return poll_to_out(poll, None)


@router.get("/", response_model=list[PollOut])
def list_polls(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    polls = (
        db.query(Poll)
        .filter(Poll.society_id == current_user.society_id)
        .order_by(Poll.created_at.desc())
        .all()
    )
    return [poll_to_out(p, current_user.id, db) for p in polls]


@router.get("/{poll_id}", response_model=PollOut)
def get_poll(poll_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll_to_out(poll, current_user.id, db)
