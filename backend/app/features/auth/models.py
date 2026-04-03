import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CONTRIBUTOR = "contributor"


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.CONTRIBUTOR
    )
    is_active: Mapped[bool] = mapped_column(default=True)

    projects: Mapped[list["Project"]] = relationship(back_populates="owner")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="contributor")
