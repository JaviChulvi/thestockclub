"""
Fund and FundPriceHistory ORM models
"""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, BigInteger, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database.models.base import Base, TimestampMixin, IdMixin


class Fund(Base, IdMixin, TimestampMixin):
    """Fund model for investment fund data"""
    __tablename__ = 'funds'
    __table_args__ = (
        Index('idx_isin', 'isin'),
        Index('idx_region', 'region'),
        Index('idx_currency', 'currency'),
        Index('idx_benchmark_id', 'benchmark_id'),
        Index('idx_category_id', 'category_id'),
    )

    # Primary identifiers
    isin = Column(String(12), unique=True, nullable=False)
    long_name = Column(String(255))
    short_name = Column(String(100))
    type_disp = Column(String(50))

    # Basic fund information
    currency = Column(String(3))
    region = Column(String(50))
    quote_source_name = Column(String(100))
    previous_close = Column(Numeric(15, 6))
    url = Column(String(500))
    category = Column(String(255))  # Legacy field, will be deprecated in favor of category_id

    # Fund details (stored as JSONB)
    fund_overview = Column(JSONB)
    sector_weightings = Column(JSONB)
    asset_classes = Column(JSONB)
    bond_holdings = Column(JSONB)
    equity_holdings = Column(JSONB)
    bond_ratings = Column(JSONB)
    classes = Column(JSONB)

    # Financial data
    fund_assets = Column(String(100))
    class_assets = Column(String(100))
    start_date = Column(String(50))

    # Fees
    management_fee = Column(Numeric(10, 4))
    performance_fee = Column(Numeric(10, 4))
    custody_fee = Column(Numeric(10, 4))
    ongoing_charges = Column(Numeric(10, 4))
    redemption_fee = Column(Numeric(10, 4))
    subscription_fee = Column(Numeric(10, 4))

    # Performance metrics
    ytd_return = Column(Numeric(15, 6))
    last_90d_return = Column(Numeric(15, 6))

    # Foreign keys
    benchmark_id = Column(Integer, ForeignKey('benchmarks.id', ondelete='SET NULL'), index=True)
    manager_id = Column(Integer, ForeignKey('managers.id', ondelete='SET NULL'))
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'), index=True)

    # Relationships
    benchmark = relationship('Benchmark', back_populates='funds')
    manager = relationship('Manager', back_populates='funds')
    category_obj = relationship('Category', back_populates='funds')  # Renamed to avoid conflict with category column
    price_history = relationship('FundPriceHistory', back_populates='fund', cascade='all, delete-orphan')
    fund_holdings = relationship('FundHolding', back_populates='fund', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Fund(isin='{self.isin}', name='{self.long_name}', ytd_return={self.ytd_return})>"


class FundPriceHistory(Base, IdMixin, TimestampMixin):
    """FundPriceHistory model for historical price data"""
    __tablename__ = 'fund_price_history'
    __table_args__ = (
        Index('idx_isin_date', 'isin', 'date'),
        Index('idx_date', 'date'),
    )

    isin = Column(String(12), ForeignKey('funds.isin', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    close_price = Column(Numeric(15, 6), nullable=False)
    volume = Column(BigInteger)

    # Relationships
    fund = relationship('Fund', back_populates='price_history')

    def __repr__(self):
        return f"<FundPriceHistory(isin='{self.isin}', date={self.date}, price={self.close_price})>"
