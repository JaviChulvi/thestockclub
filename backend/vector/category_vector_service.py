"""
Category Vector Store Service
Provides LangChain integration with pgvector for semantic category search
"""
import sys
import os
import warnings
from typing import List, Dict, Any, Optional
from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.documents import Document

# Suppress deprecation warnings for legacy PGVector
warnings.filterwarnings('ignore', category=DeprecationWarning, module='langchain')

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.repositories.category_repository import CategoryRepository
from vector.config import vector_config


class CategoryVectorService:
    """Service for managing category vector store operations"""
    
    def __init__(self):
        """Initialize the category vector service with shared configuration"""
        self.category_repo = CategoryRepository()
        self.config = vector_config
        
    def get_vector_store(self) -> PGVector:
        """
        Get or create the PGVector store for categories.
        
        Note: This method is kept for compatibility but the actual search
        uses the database repository directly since we're using a custom table structure.
        """
        return PGVector(
                collection_name=self.config.COLLECTION_NAME,
                connection_string=self.config.connection_string,
                embedding_function=self.config.embeddings,
            )
    
    def sync_categories_to_vectorstore(self) -> bool:
        """
        Sync categories from our database to the langchain vector store.
        This should be called after populating categories with embeddings.
        """
        try:
            documents = self.load_categories_as_documents()
            if not documents:
                print("No categories to sync")
                return False
            
            vector_store = self.get_vector_store()
            
            # Clear existing documents and add new ones
            vector_store.add_documents(documents)
            
            print(f"Successfully synced {len(documents)} categories to vector store")
            return True
        except Exception as e:
            print(f"Error syncing categories: {e}")
            return False
    
    def load_categories_as_documents(self) -> List[Document]:
        """
        Load all categories from the database and convert them to LangChain Documents.
        Each document contains the category description as page_content and metadata fields.
        """
        categories = self.category_repo.get_all_categories()
        documents = []
        
        for category in categories:
            # Get full category details including metadata
            full_category = self.category_repo.get_category_by_id(category['id'])
            
            if not full_category or not full_category.get('description'):
                continue
            
            # Create document with description as content
            doc = Document(
                page_content=full_category['description'],
                metadata={
                    'id': full_category['id'],
                    'name': full_category['name'],
                    'fullname': full_category.get('fullname', ''),
                    'active_type': full_category.get('active_type', ''),
                    'region': full_category.get('region', ''),
                    'currency': full_category.get('currency', ''),
                    'sub_category': full_category.get('sub_category', ''),
                    'hedged_currency': full_category.get('hedged_currency', '')
                }
            )
            documents.append(doc)
        
        print(f"Loaded {len(documents)} category documents")
        return documents
    
    def search_categories(self, query: str, k: int = 5, filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Search categories using semantic similarity.
        Uses direct database queries instead of PGVector to work with our custom table structure.
        
        Args:
            query: Natural language query
            k: Number of results to return
            filter_dict: Optional metadata filters (e.g., {'active_type': 'Renta Variable'})
        
        Returns:
            List of matching categories with metadata
        """
        try:
            from openai import OpenAI
            
            # Generate embedding for the query
            client = OpenAI(api_key=self.config.get_openai_api_key())
            embedding_response = client.embeddings.create(
                model=self.config.EMBEDDING_MODEL,
                input=query
            )
            query_embedding = embedding_response.data[0].embedding
            
            # Use repository method for search with optional filters
            if filter_dict:
                results = self.category_repo.search_categories_by_metadata(
                    embedding=query_embedding,
                    active_type=filter_dict.get('active_type'),
                    region=filter_dict.get('region'),
                    currency=filter_dict.get('currency'),
                    sub_category=filter_dict.get('sub_category'),
                    hedged_currency=filter_dict.get('hedged_currency'),
                    limit=k
                )
            else:
                results = self.category_repo.search_categories_by_embedding(
                    embedding=query_embedding,
                    limit=k
                )
            
            return results
            
        except Exception as e:
            print(f"Error searching categories: {e}")
            return []
    
    def search_categories_with_scores(self, query: str, k: int = 5) -> List[tuple]:
        """
        Search categories and return results with similarity scores.
        
        Args:
            query: Natural language query
            k: Number of results to return
        
        Returns:
            List of dictionaries with similarity scores
        """
        try:
            from openai import OpenAI
            
            # Generate embedding for the query
            client = OpenAI(api_key=self.config.get_openai_api_key())
            embedding_response = client.embeddings.create(
                model=self.config.EMBEDDING_MODEL,
                input=query
            )
            query_embedding = embedding_response.data[0].embedding
            
            # Use repository method (returns results with similarity scores)
            results = self.category_repo.search_categories_by_embedding(
                embedding=query_embedding,
                limit=k
            )
            
            return results
        except Exception as e:
            print(f"Error searching categories with scores: {e}")
            return []


# Global instance for convenience
category_vector_service = CategoryVectorService()

__all__ = ['CategoryVectorService', 'category_vector_service']

