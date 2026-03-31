"""
Sync Categories to Vector Store
This script syncs categories from the database to the langchain vector store.
Run this after populating categories with embeddings using populate_categories_data.py
"""
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vector import category_vector_service

def main():
    print("=" * 60)
    print("Syncing Categories to Vector Store")
    print("=" * 60)
    
    print("\n1. Loading categories from database...")
    documents = category_vector_service.load_categories_as_documents()
    
    if not documents:
        print("❌ No categories found with descriptions and embeddings")
        print("\nPlease run populate_categories_data.py first to populate category embeddings")
        return False
    
    print(f"✓ Loaded {len(documents)} categories")
    
    print("\n2. Syncing to vector store...")
    success = category_vector_service.sync_categories_to_vectorstore()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ Successfully synced categories to vector store!")
        print("=" * 60)
        print(f"\nTotal categories synced: {len(documents)}")
        print("\nYou can now use the category search feature:")
        print("  - Test with: python test_category_search.py")
        print("  - Use in agent: agent.chat('Quiero invertir en renta variable europea')")
        return True
    else:
        print("\n" + "=" * 60)
        print("❌ Failed to sync categories")
        print("=" * 60)
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

