import ast
from pathlib import Path


def test_analytics_endpoint_declares_admin_dependency():
    source = Path(__file__).resolve().parents[2] / "app" / "api" / "routes" / "analytics.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    endpoint = next(
        node for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef) and node.name == "get_parking_analytics"
    )
    dependency_source = ast.get_source_segment(source.read_text(encoding="utf-8"), endpoint)
    assert "Depends(require_admin)" in dependency_source
