"""
Verify all test Excel files are being parsed correctly
"""
import asyncio
import sys
sys.path.insert(0, '.')

from app.services.analysis_service import analysis_service

async def verify_file(filename):
    print(f"\n{'='*60}")
    print(f"Testing: {filename}")
    print('='*60)
    
    try:
        result = await analysis_service.analyze_workbook(
            file_path=f'test_files/{filename}',
            include_values=False,
            detect_anomalies=True,
            identify_cost_drivers=True,
            top_drivers_count=50
        )
        
        graph = result.get('graph', {})
        metrics = result.get('metrics', {})
        graph_metrics = graph.get('metrics', {})
        
        print(f"\n📊 Metrics:")
        print(f"  Total Cells: {graph_metrics.get('node_count', 0)}")
        print(f"  Dependencies (Edges): {graph_metrics.get('edge_count', 0)}")
        print(f"  Formulas: {metrics.get('formula_count', 0)}")
        print(f"  Input Cells: {metrics.get('input_count', 0)}")
        print(f"  Sheets: {metrics.get('sheet_count', 0)}")
        
        print(f"\n🔗 Graph Structure:")
        print(f"  Nodes: {len(graph.get('nodes', []))}")
        print(f"  Edges: {len(graph.get('edges', []))}")
        
        # Show some formulas
        formula_nodes = [n for n in graph.get('nodes', []) if n.get('has_formula')]
        print(f"\n📈 Sample Formulas ({len(formula_nodes)} total):")
        for node in formula_nodes[:5]:
            print(f"  {node['id']}: has_formula={node['has_formula']}")
        
        # Show some edges
        edges = graph.get('edges', [])
        print(f"\n🔗 Sample Dependencies ({len(edges)} total):")
        for edge in edges[:5]:
            print(f"  {edge['source']} → {edge['target']}")
        
        # Anomalies
        anomalies = result.get('anomalies', {})
        if anomalies:
            print(f"\n⚠️ Anomalies: {anomalies.get('total_count', 0)}")
        
        # Cost drivers
        cost_drivers = result.get('cost_drivers', {})
        if cost_drivers:
            print(f"\n🎯 Cost Drivers: {cost_drivers.get('total_drivers', 0)}")
            drivers = cost_drivers.get('drivers', [])[:3]
            for i, driver in enumerate(drivers, 1):
                print(f"  {i}. {driver.get('cell_address')} (score: {driver.get('centrality_score', 0):.3f})")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    files = [
        'simple_budget.xlsx',
        'multi_sheet_references.xlsx',
        'complex_dependencies.xlsx',
        'cost_driver_model.xlsx'
    ]
    
    print("🧪 Verifying all test Excel files...")
    
    results = {}
    for filename in files:
        success = await verify_file(filename)
        results[filename] = success
    
    print(f"\n\n{'='*60}")
    print("📋 Summary:")
    print('='*60)
    for filename, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {filename}")

if __name__ == '__main__':
    asyncio.run(main())
