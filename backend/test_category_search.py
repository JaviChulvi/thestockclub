"""
Test script for category search functionality
Run this to verify the category search implementation works correctly
"""
import os
import sys
from dotenv import load_dotenv

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

def test_category_vector_service():
    """Test the CategoryVectorService"""
    print("\n=== Testing CategoryVectorService ===")
    
    try:
        from vector import category_vector_service
        
        # Test 1: Search for European equity funds
        print("\n1. Searching for 'renta fija asiática'...")
        results = category_vector_service.search_categories("renta fija asiática", k=3)
        
        if results:
            print(f"   Found {len(results)} categories:")
            for cat in results:
                print(f"   - {cat.get('name')}: {cat.get('description', '')[:100]}...")
        else:
            print("   No results found")
        
        # Test 2: Search for real estate funds
        print("\n2. Searching for 'renta variable australiana'...")
        results = category_vector_service.search_categories("renta variable australiana", k=3)
        
        if results:
            print(f"   Found {len(results)} categories:")
            for cat in results:
                print(f"   - {cat.get('name')}: {cat.get('description', '')[:100]}...")
        else:
            print("   No results found")
        
        print("\n✓ CategoryVectorService tests passed")
        return True
        
    except Exception as e:
        print(f"\n✗ CategoryVectorService test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_category_retriever():
    """Test the CategoryRetrieverService"""
    print("\n=== Testing CategoryRetrieverService ===")
    
    try:
        from vector import category_retriever_service
        
        # Test 1: Natural language search
        print("\n1. Searching with 'Quiero invertir en renta variable europea'...")
        results = category_retriever_service.search("Quiero invertir en renta variable europea", k=3)
        
        if results:
            print(f"   Found {len(results)} categories:")
            for cat in results:
                print(f"   - {cat.get('name')}: {cat.get('active_type')} | {cat.get('region')}")
        else:
            print("   No results found")
        
        # Test 2: Another search
        print("\n2. Searching with 'fondos de tecnología'...")
        results = category_retriever_service.search("fondos de tecnología", k=3)
        
        if results:
            print(f"   Found {len(results)} categories:")
            for cat in results:
                print(f"   - {cat.get('name')}: {cat.get('active_type')} | {cat.get('region')}")
        else:
            print("   No results found")
        
        print("\n✓ CategoryRetrieverService tests passed")
        return True
        
    except Exception as e:
        print(f"\n✗ CategoryRetrieverService test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_category_repository():
    """Test the CategoryRepository search method"""
    print("\n=== Testing CategoryRepository ===")
    
    try:
        from database.repositories.category_repository import CategoryRepository
        
        repo = CategoryRepository()
        
        # Test 1: Metadata-only search
        print("\n1. Searching by metadata (active_type='Renta Fija', region='Asia')...")
        results = repo.search_categories_by_metadata(
            active_type="Renta Fija",
            region="Asia",
            limit=5
        )
        
        if results:
            print(f"   Found {len(results)} categories:")
            for cat in results:
                print(f"   - {cat.get('name')}: {cat.get('active_type')} | {cat.get('region')}")
        else:
            print("   No results found")
        
        # Test 2: Get all categories
        print("\n2. Getting all categories...")
        all_cats = repo.get_all_categories()
        print(f"   Total categories in database: {len(all_cats)}")
        
        print("\n✓ CategoryRepository tests passed")
        return True
        
    except Exception as e:
        print(f"\n✗ CategoryRepository test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_agent_integration():
    """Test the agent with category search"""
    print("\n=== Testing Agent Integration ===")
    
    try:
        from agent import AiAgent
        
        agent = AiAgent()
        
        # Test query
        print("\n1. Testing agent with 'Quiero invertir en renta variable europea'...")
        response = agent.chat("Quiero invertir en renta fija asiática")
        
        print(f"\n   Agent response preview:")
        print(f"   {response}")
        
        print("\n✓ Agent integration test passed")
        return True
        
    except Exception as e:
        print(f"\n✗ Agent integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Category Search Implementation Test Suite")
    print("=" * 60)
    
    results = []
    
    # # Run tests
    results.append(("CategoryRepository", test_category_repository()))
    results.append(("CategoryVectorService", test_category_vector_service()))
    results.append(("CategoryRetrieverService", test_category_retriever()))
    # results.append(("Agent Integration", test_agent_integration()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    total_passed = sum(1 for _, passed in results if passed)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
    
    if total_passed == len(results):
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed. Please review the errors above.")

