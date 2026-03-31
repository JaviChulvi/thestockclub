"""stock data and price history

Revision ID: 6d1b405b3f84
Revises: ff35c9d4841a
Create Date: 2025-12-21 12:29:28.712821

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6d1b405b3f84'
down_revision: Union[str, None] = 'ff35c9d4841a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add stocks and stock_price_history tables
    """
    # Create stocks table
    op.create_table('stocks',
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('sector_key', sa.String(length=100), nullable=True),
        sa.Column('industry_key', sa.String(length=100), nullable=True),
        sa.Column('long_business_summary', sa.Text(), nullable=True),
        sa.Column('full_time_employees', sa.Integer(), nullable=True),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('website', sa.String(length=500), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('exchange', sa.String(length=50), nullable=True),
        sa.Column('market_cap', sa.BigInteger(), nullable=True),
        sa.Column('current_price', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('trailing_pe', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('forward_pe', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('price_to_book', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('beta', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('total_cash', sa.BigInteger(), nullable=True),
        sa.Column('total_debt', sa.BigInteger(), nullable=True),
        sa.Column('current_ratio', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('debt_to_equity', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('total_revenue', sa.BigInteger(), nullable=True),
        sa.Column('net_income_to_common', sa.BigInteger(), nullable=True),
        sa.Column('profit_margins', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('return_on_equity', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('free_cashflow', sa.BigInteger(), nullable=True),
        sa.Column('ebitda', sa.BigInteger(), nullable=True),
        sa.Column('revenue_growth', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('earnings_growth', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('trailing_eps', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('fifty_two_week_high', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('fifty_two_week_low', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('overall_risk', sa.Integer(), nullable=True),
        sa.Column('recommendation_key', sa.String(length=50), nullable=True),
        sa.Column('target_mean_price', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('number_of_analyst_opinions', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('symbol')
    )

    # Create indexes for stocks
    op.create_index('idx_stock_country', 'stocks', ['country'], unique=False)
    op.create_index('idx_stock_industry', 'stocks', ['industry_key'], unique=False)
    op.create_index('idx_stock_sector', 'stocks', ['sector_key'], unique=False)
    op.create_index('idx_stock_symbol', 'stocks', ['symbol'], unique=False)

    # Create stock_price_history table
    op.create_table('stock_price_history',
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('close_price', sa.Numeric(precision=15, scale=6), nullable=False),
        sa.Column('volume', sa.BigInteger(), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['symbol'], ['stocks.symbol'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('symbol', 'date', name='uq_stock_symbol_date')
    )

    # Create indexes for stock_price_history
    op.create_index('idx_stock_price_date', 'stock_price_history', ['date'], unique=False)
    op.create_index('idx_stock_symbol_date', 'stock_price_history', ['symbol', 'date'], unique=False)


def downgrade() -> None:
    """
    Remove stocks and stock_price_history tables
    """
    # Drop indexes first
    op.drop_index('idx_stock_symbol_date', table_name='stock_price_history')
    op.drop_index('idx_stock_price_date', table_name='stock_price_history')

    # Drop tables
    op.drop_table('stock_price_history')

    op.drop_index('idx_stock_symbol', table_name='stocks')
    op.drop_index('idx_stock_sector', table_name='stocks')
    op.drop_index('idx_stock_industry', table_name='stocks')
    op.drop_index('idx_stock_country', table_name='stocks')

    op.drop_table('stocks')
