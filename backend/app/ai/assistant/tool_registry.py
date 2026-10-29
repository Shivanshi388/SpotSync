class ToolRegistry:

    def __init__(self):
        self.tools = {}

    def register(self, name: str, function):
        self.tools[name] = function

    def get(self, name: str):
        return self.tools.get(name)

    def list_tools(self):
        return list(self.tools.keys())


tool_registry = ToolRegistry()
