"""increase_message_isin_column_size

Revision ID: 5c24259db87a
Revises: 2bdc83ae0468
Create Date: 2026-01-14 12:55:46.645202

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c24259db87a'
down_revision: Union[str, None] = '2bdc83ae0468'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Increase the size of the isin column from VARCHAR(12) to VARCHAR(500)
    # This allows storing JSON data for artifact parameters
    op.alter_column('messages', 'isin',
                    existing_type=sa.String(12),
                    type_=sa.String(500),
                    existing_nullable=True)


def downgrade() -> None:
    # Revert back to VARCHAR(12)
    op.alter_column('messages', 'isin',
                    existing_type=sa.String(500),
                    type_=sa.String(12),
                    existing_nullable=True)

