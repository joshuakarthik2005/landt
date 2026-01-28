import asyncio
import sys
import json
from app.services.analysis_service import analysis_service

async def main():
    # Test with a sample file
    test_file = 'test_files/simple_budget.xlsx'
    
    print(f"Testing Excel reading with: {test_file}")
    print("=" * 60)
    
    try:
        result = await analysis_service.analyze_workbook(
            file_path=test_file,
            include_values=True,
            detect_anomalies=False,
            identify_cost_drivers=False
        )
        
        # Check graph data
        graph = result.get('graph', {})
        nodes = graph.get('nodes', [])
        
        print(f"\nTotal nodes: {len(nodes)}")
        print("\nFirst 5 nodes:")
        for i, node in enumerate(nodes[:5]):
            print(f"\n  Node {i+1}:")
            print(f"    ID: {node.get('id')}")
            print(f"    Has Formula: {node.get('has_formula')}")
            print(f"    Formula: {node.get('formula')}")
            print(f"    Value: {repr(node.get('value'))}")
            print(f"    Is Input: {node.get('is_input')}")
        
        # Check inputs specifically
        inputs = [n for n in nodes if n.get('is_input')]
        print(f"\n\nTotal input nodes: {len(inputs)}")
        if inputs:
            print("First input node:")
            inp = inputs[0]
            print(f"  ID: {inp.get('id')}")
            print(f"  Value: {repr(inp.get('value'))}")
        
        # Check formulas specifically
        formulas = [n for n in nodes if n.get('has_formula')]
        print(f"\n\nTotal formula nodes: {len(formulas)}")
        if formulas:
            print("First formula node:")
            form = formulas[0]
            print(f"  ID: {form.get('id')}")
            print(f"  Formula: {form.get('formula')}")
            print(f"  Value: {repr(form.get('value'))}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
