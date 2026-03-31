"""
Benchmark, Manager, Holding, and FundHolding ORM models
"""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
from database.models.base import Base, TimestampMixin, IdMixin


class Benchmark(Base, IdMixin, TimestampMixin):
    """Benchmark model for market benchmarks (MSCI, S&P, etc.)"""
    __tablename__ = 'benchmarks'

    name = Column(String(255), unique=True, nullable=False, index=True)
    url = Column(String(500))

    # Relationships
    funds = relationship('Fund', back_populates='benchmark')

    def __repr__(self):
        return f"<Benchmark(id={self.id}, name='{self.name}')>"


class Manager(Base, IdMixin, TimestampMixin):
    """Manager model for fund managers"""
    __tablename__ = 'managers'
    __table_args__ = (
        Index('idx_managers_name', 'name'),
    )

    name = Column(String(255), unique=True, nullable=False)
    url = Column(String(500))

    # Relationships
    funds = relationship('Fund', back_populates='manager')

    def __repr__(self):
        return f"<Manager(id={self.id}, name='{self.name}')>"


class Holding(Base, IdMixin, TimestampMixin):
    """Holding model for individual stock holdings"""
    __tablename__ = 'holdings'

    name = Column(String(255), nullable=False, index=True)
    symbol = Column(String(30), unique=True, nullable=False, index=True)

    # Relationships
    fund_holdings = relationship('FundHolding', back_populates='holding', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Holding(id={self.id}, name='{self.name}', symbol='{self.symbol}')>"


class FundHolding(Base, IdMixin, TimestampMixin):
    """FundHolding model for many-to-many relationship between funds and holdings"""
    __tablename__ = 'fund_holdings'
    __table_args__ = (
        Index('idx_fund_isin', 'fund_isin'),
        Index('idx_holding_id', 'holding_id'),
    )

    fund_isin = Column(String(12), ForeignKey('funds.isin', ondelete='CASCADE'), nullable=False)
    holding_id = Column(Integer, ForeignKey('holdings.id', ondelete='CASCADE'), nullable=False)
    holding_percent = Column(Numeric(10, 8), nullable=False)

    # Relationships
    fund = relationship('Fund', back_populates='fund_holdings')
    holding = relationship('Holding', back_populates='fund_holdings')

    def __repr__(self):
        return f"<FundHolding(fund_isin='{self.fund_isin}', holding_id={self.holding_id}, percent={self.holding_percent})>"
