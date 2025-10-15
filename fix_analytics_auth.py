#!/usr/bin/env python3
"""
Script to add authentication to all analytics endpoints
Adds: current_user: User = Depends(get_current_user)
"""

import re
from pathlib import Path

# Files to fix
FILES_TO_FIX = [
    "apps/api/liderix_api/routes/analytics/dashboard.py",
    "apps/api/liderix_api/routes/analytics/sales.py",
    "apps/api/liderix_api/routes/data_analytics/campaigns.py",
]

def add_auth_to_endpoint(content: str, function_name: str) -> str:
    """Add current_user parameter to endpoint function if not present"""

    # Pattern to match function definition
    pattern = rf"(@router\.(get|post|put|delete)\([^\)]*\)\s*async def {function_name}\s*\([^)]*\):)"

    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"  ⚠️  Could not find endpoint: {function_name}")
        return content

    full_match = match.group(0)

    # Check if already has current_user
    if "current_user:" in full_match or "current_user :" in full_match:
        print(f"  ✅ Already has auth: {function_name}")
        return content

    # Find the closing parenthesis of parameters
    # Add current_user before db parameter if exists, otherwise at end
    if "db:" in full_match or "db :" in full_match:
        # Add before db parameter
        new_match = re.sub(
            r"(\s*)(db\s*:\s*AsyncSession)",
            r"\1current_user: User = Depends(get_current_user),\n\1\2",
            full_match
        )
    else:
        # Add at end of parameters (before closing paren and colon)
        new_match = re.sub(
            r"(\s*)(\):)",
            r",\1current_user: User = Depends(get_current_user)\1\2",
            full_match
        )

    content = content.replace(full_match, new_match)
    print(f"  ✅ Added auth to: {function_name}")
    return content

def ensure_imports(content: str) -> str:
    """Ensure auth imports are present"""

    # Check if imports already exist
    if "from liderix_api.services.auth import get_current_user" in content:
        return content

    # Find the last import line
    import_lines = []
    for i, line in enumerate(content.split('\n')):
        if line.startswith('from ') or line.startswith('import '):
            import_lines.append(i)

    if not import_lines:
        # No imports found, add after docstring
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if '"""' in line or "'''" in line:
                # Find closing docstring
                for j in range(i+1, len(lines)):
                    if '"""' in lines[j] or "'''" in lines[j]:
                        # Insert imports after docstring
                        lines.insert(j+2, "from liderix_api.services.auth import get_current_user")
                        lines.insert(j+3, "from liderix_api.models.users import User")
                        return '\n'.join(lines)
        return content

    # Add imports after last import
    lines = content.split('\n')
    last_import_line = max(import_lines)

    # Find the import from liderix_api.db (add auth imports near it)
    for i, line in enumerate(lines):
        if 'from liderix_api.db import' in line:
            lines.insert(i+1, "from liderix_api.services.auth import get_current_user")
            lines.insert(i+2, "from liderix_api.models.users import User")
            return '\n'.join(lines)

    # Fallback: add after last import
    lines.insert(last_import_line + 1, "from liderix_api.services.auth import get_current_user")
    lines.insert(last_import_line + 2, "from liderix_api.models.users import User")
    return '\n'.join(lines)

def find_all_endpoints(content: str) -> list[str]:
    """Find all endpoint function names in the file"""
    pattern = r"@router\.(get|post|put|delete)\([^\)]*\)\s*async def (\w+)"
    matches = re.findall(pattern, content)
    return [match[1] for match in matches]

def fix_file(file_path: str):
    """Fix authentication in a single file"""
    path = Path(file_path)

    if not path.exists():
        print(f"❌ File not found: {file_path}")
        return

    print(f"\n📄 Processing: {file_path}")

    content = path.read_text()
    original_content = content

    # Step 1: Ensure imports
    content = ensure_imports(content)

    # Step 2: Find all endpoints
    endpoints = find_all_endpoints(content)
    print(f"   Found {len(endpoints)} endpoints: {', '.join(endpoints)}")

    # Step 3: Add auth to each endpoint
    for endpoint_name in endpoints:
        content = add_auth_to_endpoint(content, endpoint_name)

    # Step 4: Write back if changed
    if content != original_content:
        path.write_text(content)
        print(f"✅ Updated: {file_path}")
    else:
        print(f"ℹ️  No changes needed: {file_path}")

def main():
    print("🔒 Adding authentication to analytics endpoints...")
    print("=" * 60)

    for file_path in FILES_TO_FIX:
        fix_file(file_path)

    print("\n" + "=" * 60)
    print("✅ Done! All files processed.")
    print("\nNext steps:")
    print("1. Review changes: git diff")
    print("2. Test locally: pytest")
    print("3. Deploy to production")

if __name__ == "__main__":
    main()
