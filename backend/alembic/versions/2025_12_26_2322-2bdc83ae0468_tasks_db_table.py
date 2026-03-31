"""tasks db table

Revision ID: 2bdc83ae0468
Revises: 6d1b405b3f84
Create Date: 2025-12-26 23:22:44.256221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2bdc83ae0468'
down_revision: Union[str, None] = '6d1b405b3f84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add data_tasks table for background task tracking
    """
    op.create_table('data_tasks',
        sa.Column('task_type', sa.Enum('UPDATE_FUNDS', 'LOAD_STOCKS', name='tasktype'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', name='taskstatus'), nullable=False),
        sa.Column('started_by', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('output_log', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('process_id', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """
    Remove data_tasks table
    """
    op.drop_table('data_tasks')
