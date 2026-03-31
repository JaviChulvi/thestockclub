"""
Category ORM model with pgvector support
"""
from sqlalchemy import Column, Integer, String, Text, Index
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from database.models.base import Base, TimestampMixin, IdMixin


class Category(Base, IdMixin, TimestampMixin):
    """Category model for fund categorization with semantic search support"""
    __tablename__ = 'categories'
    __table_args__ = (
        Index('idx_category_name', 'name'),
        Index('idx_category_embedding', 'embedding', postgresql_using='ivfflat', postgresql_ops={'embedding': 'vector_cosine_ops'}),
    )

    name = Column(String(100), unique=True, nullable=False)
    fullname = Column(String(255))
    description = Column(Text)

    # Category metadata for filtering
    active_type = Column(String(50))  # Renta Fija, Renta Variable, Mix, Alternativo, Inmobiliario, Monetario
    region = Column(String(50))  # Europe, USA, Asia, Latin America, Africa, Oceania, Global
    currency = Column(String(4))  # EUR, USD, GBP, JPY, etc.
    sub_category = Column(String(50))  # Deuda Corporativa, Deuda Pública, Event Driven, Convertibles, Agresivo, Defensivo, etc.
    hedged_currency = Column(String(50))  # EUR Cubierto, USD Cubierto, GBP Cubierto, JPY Cubierto, etc.

    # Vector embedding for semantic search (1536 dimensions for OpenAI embeddings)
    embedding = Column(Vector(1536))

    # Relationships
    funds = relationship('Fund', back_populates='category_obj')

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', active_type='{self.active_type}', region='{self.region}')>"
