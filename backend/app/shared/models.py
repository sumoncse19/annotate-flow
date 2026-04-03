"""Import all models so SQLAlchemy can resolve relationship references across features."""

from app.shared.base_model import Base  # noqa: F401
from app.features.auth.models import User  # noqa: F401
from app.features.projects.models import Project  # noqa: F401
from app.features.tasks.models import Task  # noqa: F401
from app.features.submissions.models import Submission  # noqa: F401
