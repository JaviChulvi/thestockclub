"""
Shared configuration for vector search services
Eliminates code duplication across vector-related modules
"""
import os
from typing import Optional
from langchain_postgres import PGEngine
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class VectorConfig:
    """
    Centralized configuration for vector search services.
    Provides shared connection strings, embeddings, and engine instances.
    """
    
    # Vector configuration constants
    VECTOR_SIZE = 1536  # text-embedding-3-small dimension
    EMBEDDING_MODEL = "text-embedding-3-small"
    COLLECTION_NAME = "langchain_categories"
    
    def __init__(self):
        """Initialize shared configuration"""
        self._connection_string: Optional[str] = None
        self._embeddings: Optional[OpenAIEmbeddings] = None
        self._engine: Optional[PGEngine] = None
    
    @property
    def connection_string(self) -> str:
        """
        Get PostgreSQL connection string for psycopg3.
        Cached after first access.
        """
        if self._connection_string is None:
            self._connection_string = (
                f"postgresql+psycopg://{os.getenv('DB_USER', 'postgres')}:"
                f"{os.getenv('DB_PASSWORD', '')}@"
                f"{os.getenv('DB_HOST', 'localhost')}:"
                f"{os.getenv('DB_PORT', '5432')}/"
                f"{os.getenv('DB_NAME', 'fundlord')}"
            )
        return self._connection_string
    
    @property
    def embeddings(self) -> OpenAIEmbeddings:
        """
        Get OpenAI embeddings instance.
        Cached after first access.
        """
        if self._embeddings is None:
            self._embeddings = OpenAIEmbeddings(
                model=self.EMBEDDING_MODEL,
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
        return self._embeddings
    
    @property
    def engine(self) -> PGEngine:
        """
        Get PGEngine instance.
        Cached after first access.
        """
        if self._engine is None:
            self._engine = PGEngine.from_connection_string(url=self.connection_string)
        return self._engine
    
    def get_openai_api_key(self) -> str:
        """Get OpenAI API key from environment"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        return api_key


# Global singleton instance
vector_config = VectorConfig()

__all__ = ['VectorConfig', 'vector_config']

