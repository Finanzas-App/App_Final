"""rename roles to spanish names

Revision ID: 005
Revises: 004
"""
from typing import Sequence, Union

from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'Administrador' WHERE role = 'Admin'")
    op.execute("UPDATE users SET role = 'Vendedor' WHERE role = 'Executive'")
    op.execute("UPDATE users SET role = 'Soporte' WHERE role = 'Analyst'")


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'Admin' WHERE role = 'Administrador'")
    op.execute("UPDATE users SET role = 'Executive' WHERE role = 'Vendedor'")
    op.execute("UPDATE users SET role = 'Analyst' WHERE role = 'Soporte'")
