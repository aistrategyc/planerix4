#!/bin/bash

# ============================================================================
# Complete Authentication Fix for All Analytics Endpoints
# ============================================================================
# This script adds authentication to ALL remaining analytics endpoints
# Run from project root: ./COMPLETE_AUTH_FIX_SCRIPT.sh
# ============================================================================

set -e

echo "🔒 Applying authentication fix to all remaining endpoints..."
echo "================================================================"

# Fix sales.py - Add current_user to all endpoints except /test
echo ""
echo "📄 Fixing apps/api/liderix_api/routes/analytics/sales.py..."

python3 << 'PYTHON'
import re
from pathlib import Path

file_path = Path("apps/api/liderix_api/routes/analytics/sales.py")
content = file_path.read_text()

# List of endpoints to fix
endpoints_to_fix = [
    "get_platform_share",
    "get_utm_sources",
    "get_budget_recommendations",
    "get_paid_split_platforms",
    "get_revenue_trend",
    "get_sales_by_products",
    "get_funnel_analysis",
    "get_funnel_aggregate",
    "get_organic_vs_paid_traffic",
    "get_products_performance"
]

for endpoint in endpoints_to_fix:
    # Find function definition
    pattern = rf"(async def {endpoint}\([^)]*?)(db|session)(\s*:\s*AsyncSession\s*=\s*Depends\([^)]+\))"

    def replacer(match):
        if "current_user" in match.group(0):
            return match.group(0)  # Already has auth

        before = match.group(1)
        param_name = match.group(2)
        param_def = match.group(3)

        return f"{before}\n    current_user: User = Depends(get_current_user),\n    {param_name}{param_def}"

    content = re.sub(pattern, replacer, content)
    print(f"  ✅ Fixed: {endpoint}")

file_path.write_text(content)
print(f"\n✅ Updated: {file_path}")
PYTHON

# Fix campaigns.py
echo ""
echo "📄 Fixing apps/api/liderix_api/routes/data_analytics/campaigns.py..."

python3 << 'PYTHON'
import re
from pathlib import Path

file_path = Path("apps/api/liderix_api/routes/data_analytics/campaigns.py")

if not file_path.exists():
    print(f"  ⚠️  File not found: {file_path}")
    exit(0)

content = file_path.read_text()
original = content

# Add imports if not present
if "from liderix_api.services.auth import get_current_user" not in content:
    # Find the line with get_itstep_session import
    import_line = "from liderix_api.db import"
    if import_line in content:
        content = content.replace(
            import_line,
            f"from liderix_api.services.auth import get_current_user\nfrom liderix_api.models.users import User\n{import_line}"
        )
        print("  ✅ Added imports")

# Find all endpoint functions
pattern = r"(async def \w+\([^)]*?)(session|db)(\s*:\s*AsyncSession\s*=\s*Depends\([^)]+\))"

def replacer(match):
    if "current_user" in match.group(0):
        return match.group(0)

    before = match.group(1)
    param_name = match.group(2)
    param_def = match.group(3)

    return f"{before}\n    current_user: User = Depends(get_current_user),\n    {param_name}{param_def}"

content = re.sub(pattern, replacer, content)

if content != original:
    file_path.write_text(content)
    print(f"✅ Updated: {file_path}")
else:
    print(f"ℹ️  No changes needed: {file_path}")
PYTHON

echo ""
echo "================================================================"
echo "✅ All files updated!"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff apps/api/liderix_api/routes/analytics/"
echo "2. Test locally: Run check_auth_health.sh"
echo "3. Commit changes: git add . && git commit -m 'SECURITY: Add auth to all endpoints'"
echo "4. Deploy to production"
