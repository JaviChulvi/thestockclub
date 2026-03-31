"""
Category Retriever Service
Provides SelfQueryRetriever for natural language category search
"""
import sys
import os
import warnings
from typing import List, Dict, Any
from langchain.chains.query_constructor.base import AttributeInfo
from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores.pgvector import PGVector

# Suppress deprecation warnings for legacy PGVector
warnings.filterwarnings('ignore', category=DeprecationWarning, module='langchain')

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vector.config import vector_config


class CategoryRetrieverService:
    """Service for natural language category search using SelfQueryRetriever"""
    
    def __init__(self):
        """Initialize the category retriever service with shared configuration"""
        self.config = vector_config
        
        # Define metadata fields that can be used for filtering
        self.metadata_field_info = [
            AttributeInfo(
                name="active_type",
                description="La clase de activo del fondo: 'Renta Fija' (bonos/deuda), 'Renta Variable' (acciones), 'Mixto' (combinación), 'Alternativo' (estrategias alternativas), 'Inmobiliario' (bienes raíces), 'Monetario' (efectivo/corto plazo), 'Otro'",
                type="string",
            ),
            AttributeInfo(
                name="region",
                description="La región geográfica de inversión: 'Europa', 'USA' (Estados Unidos), 'Asia', 'America Latina', 'Africa', 'Oceania', 'Global' (mundial), 'Otro'",
                type="string",
            ),
            AttributeInfo(
                name="currency",
                description="La divisa principal del fondo: 'EUR' (Euro), 'USD' (Dólar), 'GBP' (Libra), 'JPY' (Yen), 'CHF' (Franco Suizo), 'Otro'",
                type="string",
            ),
            AttributeInfo(
                name="sub_category",
                description="Subcategoría o estrategia específica: 'Deuda Corporativa' (bonos de empresas), 'Deuda Pública' (bonos gubernamentales), 'Event Driven' (eventos corporativos), 'Convertibles' (bonos convertibles), 'Agresivo' (alto riesgo/retorno), 'Defensivo' (bajo riesgo), 'Small/Mid-Cap' (empresas pequeñas/medianas), 'Otro'",
                type="string",
            ),
            AttributeInfo(
                name="hedged_currency",
                description="Si el fondo cubre su exposición a divisas: 'EUR Cubierto', 'USD Cubierto', 'GBP Cubierto', 'JPY Cubierto', 'N/A' (sin cobertura), 'Otro'",
                type="string",
            ),
        ]
        
        # Document content description for the LLM
        self.document_content_description = (
            "Descripción detallada de la estrategia y política de inversión de una categoría de fondos. "
            "Incluye información sobre el tipo de activos, región geográfica, estrategia de inversión, "
            "divisa base y cobertura de divisas."
        )
        
        # Initialize LLM for query parsing
        self.llm = ChatOpenAI(
            temperature=0,
            model="gpt-4o",
            openai_api_key=self.config.get_openai_api_key()
        )
        
        self._retriever = None
    
    def get_retriever(self) -> SelfQueryRetriever:
        """
        Get or create the SelfQueryRetriever instance.
        This retriever can parse natural language queries and convert them
        to structured queries with filters.
        
        Note: Uses legacy PGVector for SelfQueryRetriever compatibility.
        """
        if self._retriever is None:
            # Use legacy PGVector for SelfQueryRetriever compatibility
            vector_store = PGVector(
                collection_name=self.config.COLLECTION_NAME,
                connection_string=self.config.connection_string,
                embedding_function=self.config.embeddings,
            )
            
            # Create SelfQueryRetriever
            self._retriever = SelfQueryRetriever.from_llm(
                self.llm,
                vector_store,
                self.document_content_description,
                self.metadata_field_info,
                verbose=False,  # Set to False to reduce noise
                enable_limit=True,  # Allow limiting results
            )
        
        return self._retriever
    
    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for categories using natural language query.
        
        Args:
            query: Natural language query (e.g., "Quiero invertir en renta variable europea")
            k: Number of results to return
        
        Returns:
            List of matching categories with metadata
        """
        try:
            retriever = self.get_retriever()
            
            print(f"Searching for categories with query: {query}")
            # Invoke the retriever with the query
            results = retriever.invoke(query)
            
            print(f"SelfQueryRetriever returned {len(results)} results")
            # If no results, fall back to direct database search
            if not results:
                print("No results from SelfQueryRetriever, using direct database search fallback")
                from openai import OpenAI
                from database.repositories.category_repository import CategoryRepository
                
                category_repo = CategoryRepository()
                client = OpenAI(api_key=self.config.get_openai_api_key())
                embedding_response = client.embeddings.create(
                    model=self.config.EMBEDDING_MODEL,
                    input=query
                )
                query_embedding = embedding_response.data[0].embedding
                return category_repo.search_categories_by_embedding(
                    embedding=query_embedding,
                    limit=k
                )
            
            # Convert results to dictionary format
            categories = []
            for doc in results[:k]:
                try:
                    category = {
                        'id': doc.metadata.get('id'),
                        'name': doc.metadata.get('name'),
                        'fullname': doc.metadata.get('fullname'),
                        'description': doc.page_content,
                        'active_type': doc.metadata.get('active_type'),
                        'region': doc.metadata.get('region'),
                        'currency': doc.metadata.get('currency'),
                        'sub_category': doc.metadata.get('sub_category'),
                        'hedged_currency': doc.metadata.get('hedged_currency')
                    }
                    categories.append(category)
                except Exception as e:
                    print(f"Error converting result to dictionary: {e}, doc: {doc}")
                    continue
            
            return categories
            
        except Exception as e:
            print(f"Error searching categories with retriever: {e}")
            # Fallback to direct database search
            from openai import OpenAI
            from database.repositories.category_repository import CategoryRepository
            
            try:
                category_repo = CategoryRepository()
                client = OpenAI(api_key=self.config.get_openai_api_key())
                embedding_response = client.embeddings.create(
                    model=self.config.EMBEDDING_MODEL,
                    input=query
                )
                query_embedding = embedding_response.data[0].embedding
                return category_repo.search_categories_by_embedding(
                    embedding=query_embedding,
                    limit=k
                )
            except Exception as fallback_error:
                print(f"Fallback search also failed: {fallback_error}")
                return []
    
    def search_with_filters(self, query: str, filters: Dict[str, str], k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for categories with explicit filters.
        
        Args:
            query: Natural language query
            filters: Dictionary of metadata filters (e.g., {'active_type': 'Renta Variable'})
            k: Number of results to return
        
        Returns:
            List of matching categories
        """
        try:
            from openai import OpenAI
            from database.repositories.category_repository import CategoryRepository
            
            category_repo = CategoryRepository()
            client = OpenAI(api_key=self.config.get_openai_api_key())
            embedding_response = client.embeddings.create(
                model=self.config.EMBEDDING_MODEL,
                input=query
            )
            query_embedding = embedding_response.data[0].embedding
            
            return category_repo.search_categories_by_metadata(
                embedding=query_embedding,
                active_type=filters.get('active_type'),
                region=filters.get('region'),
                currency=filters.get('currency'),
                sub_category=filters.get('sub_category'),
                hedged_currency=filters.get('hedged_currency'),
                limit=k
            )
        except Exception as e:
            print(f"Error searching with filters: {e}")
            return []


# Global instance for convenience
category_retriever_service = CategoryRetrieverService()

__all__ = ['CategoryRetrieverService', 'category_retriever_service']

