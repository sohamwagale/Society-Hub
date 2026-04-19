# Import uuid for generating unique IDs for polls, options, and votes
import uuid
# Import datetime for handling voting deadlines and creation timestamps
from datetime import datetime
# Import FastAPI components for routing, dependency injection, and error handling
from fastapi import APIRouter, Depends, HTTPException
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session
# Import database session utility
from app.database import get_db
# Import User model for authentication context
from app.models.user import User
# Import poll-related models
from app.models.poll import Poll, PollOption, Vote
# Import Pydantic schemas for request validation and response formatting
from app.schemas.poll import PollCreate, PollOut, PollOptionOut, VoteCreate, VoteOut
# Import auth utilities for role checks and user identification
from app.utils.auth import get_current_user, require_role
# Import notification service to alert residents about new polls
from app.services.notification_service import notify_all_residents
# Import notification type enum
from app.models.notification import NotificationType

# Initialize router with relevant prefix and tag
router = APIRouter(prefix="/api/polls", tags=["Polls"])


# ── Poll Creation & Lifecycle ──

# POST endpoint for admins to launch a new community poll
@router.post("", response_model=PollOut, status_code=201)
def create_poll(
    data: PollCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # Initialize the primary Poll record
    poll = Poll(
        # Generate a unique tracking ID
        id=str(uuid.uuid4()),
        # Link to the admin's specific society
        society_id=admin.society_id,
        # Set title and optional description
        title=data.title,
        description=data.description,
        # Track who launched the poll
        created_by=admin.id,
        # Set the expiration timestamp
        deadline=data.deadline,
        # Initialize as active
        is_active=True,
    )
    # Add to session
    db.add(poll)
    # Flush to resolve IDs for child objects (options)
    db.flush()

    # Iterate through the provided list of voting options
    for opt in data.options:
        # Create a PollOption record for each choice
        option = PollOption(id=str(uuid.uuid4()), poll_id=poll.id, text=opt.text)
        db.add(option)

    # Finalize the entire batch (Poll + all Options)
    db.commit()
    # Reload fresh state
    db.refresh(poll)

    # ── Broadcast Alert ──
    # Notify all active residents of the society about the new voting opportunity
    notify_all_residents(
        db, f"New Society Poll: {poll.title}",
        f"Cast your vote before {poll.deadline.strftime('%d %b %Y %H:%M')}",
        NotificationType.POLL, poll.id,
        society_id=admin.society_id,
    )

    # Return the poll in formatted output (mapping to Out schema)
    return _poll_to_out(poll, None)


# ── Poll Discovery ──

# GET endpoint to list all polls within the user's society
@router.get("", response_model=list[PollOut])
def list_polls(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Retrieve all polls linked to the requester's society
    polls = (
        db.query(Poll)
        .filter(Poll.society_id == current_user.society_id)
        # Order by newest first
        .order_by(Poll.created_at.desc())
        .all()
    )
    # Map results to out schema, including user-specific voting status
    return [_poll_to_out(p, current_user.id, db) for p in polls]


# GET endpoint to fetch details of a specific poll
@router.get("/{poll_id}", response_model=PollOut)
def get_poll(poll_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # find poll by ID
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    # error if missing
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    # Return formatted output
    return _poll_to_out(poll, current_user.id, db)


# ── Voting Mechanics ──

# POST endpoint for users to cast their vote
@router.post("/{poll_id}/vote", response_model=VoteOut, status_code=201)
def vote_on_poll(
    poll_id: str,
    data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # locate the target poll
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Validation: Ensure poll hasn't been manually closed
    if not poll.is_active:
        raise HTTPException(status_code=400, detail="This poll is no longer accepting votes")
    
    # Validation: Ensure deadline hasn't elapsed
    if poll.deadline < datetime.utcnow():
        raise HTTPException(status_code=400, detail="The voting window for this poll has closed")

    # Validation: Enforce one vote per user
    existing = db.query(Vote).filter(Vote.poll_id == poll_id, Vote.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already participated in this poll")

    # Validation: Ensure the selected option actually belongs to this poll
    option = db.query(PollOption).filter(PollOption.id == data.option_id, PollOption.poll_id == poll_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Invalid voting option selected")

    # ── Record the Vote ──
    vote = Vote(
        id=str(uuid.uuid4()),
        poll_id=poll_id,
        option_id=data.option_id,
        user_id=current_user.id,
    )
    db.add(vote)
    
    # Increment the aggregate vote count on the option for quick result reading
    option.vote_count += 1
    
    # finalize transaction
    db.commit()
    db.refresh(vote)
    return vote


# ── Internal Helpers ──

# Helper function to map a Poll model + context to the PollOut schema
def _poll_to_out(poll: Poll, user_id: str | None, db: Session | None = None) -> PollOut:
    """Combines poll data with user-specific context (like 'has this user voted?') for the UI."""
    user_voted = None
    # If a user session is active, check if they have a recorded vote for this poll
    if user_id and db:
        vote = db.query(Vote).filter(Vote.poll_id == poll.id, Vote.user_id == user_id).first()
        user_voted = vote is not None

    # Construct the list of option objects for the response
    options = [PollOptionOut(id=o.id, text=o.text, vote_count=o.vote_count) for o in poll.options]
    
    # Assemble the final unified output object
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


# ── Administrative Management ──

# PUT endpoint to manually expire a poll before its deadline
@router.put("/{poll_id}/close")
def close_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # locate record
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # mark as inactive
    poll.is_active = False
    # save
    db.commit()
    return {"detail": "Poll successfully closed to further voting"}


# DELETE endpoint to permanently remove a poll
@router.delete("/{poll_id}")
def delete_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # locate poll
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # Safety: block deletion if the poll has already collected data (votes)
    vote_count = db.query(Vote).filter(Vote.poll_id == poll_id).count()
    if vote_count > 0:
        raise HTTPException(status_code=400, detail="Integrity error: Cannot delete a poll that contains active voting records")

    # Cascade delete options manually (if not handled by DB constraints)
    for opt in poll.options:
        db.delete(opt)
    
    # delete the parent poll
    db.delete(poll)
    # Finalize removal
    db.commit()
    return {"detail": "Poll and its choices have been permanently deleted"}
