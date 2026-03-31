"""
Stock ORM model for yfinance stock data
"""
from sqlalchemy import Column, Integer, String, Numeric, Text, BigInteger, Index, ForeignKey, Date, UniqueConstraint
from database.models.base import Base, TimestampMixin, IdMixin
from sqlalchemy.orm import relationship

class Stock(Base, IdMixin, TimestampMixin):
    """Stock model for equity/stock data from yfinance"""
    __tablename__ = 'stocks'
    __table_args__ = (
        Index('idx_stock_symbol', 'symbol'),
        Index('idx_stock_sector', 'sector_key'),
        Index('idx_stock_industry', 'industry_key'),
        Index('idx_stock_country', 'country'),
    )

    # Primary identifier
    symbol = Column(String(20), unique=True, nullable=False)

    # General info
    country = Column(String(100))
    sector_key = Column(String(100))
    industry_key = Column(String(100))
    long_business_summary = Column(Text)
    full_time_employees = Column(Integer)
    address = Column(String(255))
    website = Column(String(500))
    currency = Column(String(10))
    exchange = Column(String(50))

    # Valuation & Market Size
    market_cap = Column(BigInteger)
    current_price = Column(Numeric(15, 4))
    trailing_pe = Column(Numeric(15, 4))
    forward_pe = Column(Numeric(15, 4))
    price_to_book = Column(Numeric(15, 4))
    beta = Column(Numeric(10, 4))

    # Financial Position
    total_cash = Column(BigInteger)
    total_debt = Column(BigInteger)
    current_ratio = Column(Numeric(10, 4))
    debt_to_equity = Column(Numeric(15, 4))

    # Profitability & Cash Flow
    total_revenue = Column(BigInteger)
    net_income_to_common = Column(BigInteger)
    profit_margins = Column(Numeric(10, 6))
    return_on_equity = Column(Numeric(10, 6))
    free_cashflow = Column(BigInteger)
    ebitda = Column(BigInteger)

    # Growth & Performance
    revenue_growth = Column(Numeric(10, 6))
    earnings_growth = Column(Numeric(10, 6))
    trailing_eps = Column(Numeric(15, 4))
    fifty_two_week_high = Column(Numeric(15, 4))
    fifty_two_week_low = Column(Numeric(15, 4))

    # Financial Health & Risk
    overall_risk = Column(Integer)

    # Analyst Expectations
    recommendation_key = Column(String(50))
    target_mean_price = Column(Numeric(15, 4))
    number_of_analyst_opinions = Column(Integer)

    # Relationships
    price_history = relationship('StockPriceHistory', back_populates='stock', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Stock(symbol='{self.symbol}', sector='{self.sector_key}', price={self.current_price})>"

class StockPriceHistory(Base, IdMixin, TimestampMixin):
    """StockPriceHistory model for historical price data"""
    __tablename__ = 'stock_price_history'
    __table_args__ = (
        Index('idx_stock_symbol_date', 'symbol', 'date'),
        Index('idx_stock_price_date', 'date'),
        UniqueConstraint('symbol', 'date', name='uq_stock_symbol_date'),
    )

    symbol = Column(String(20), ForeignKey('stocks.symbol', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    close_price = Column(Numeric(15, 6), nullable=False)
    volume = Column(BigInteger)

    # Relationships
    stock = relationship('Stock', back_populates='price_history')

    def __repr__(self):
        return f"<StockPriceHistory(symbol='{self.symbol}', date={self.date}, price={self.close_price})>"