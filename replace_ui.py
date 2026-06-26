import re

with open("app/trips/new/page.tsx", "r") as f:
    trips_content = f.read()

# Extract the "Step 2: Add Products" div
step2_match = re.search(r'(<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">\s*<h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">\s*<PackagePlus className="w-4 h-4 text-ruby-600" />\s*2\. Add Products\s*</h2>.*?)<!-- ── RIGHT: Manifest ── -->', trips_content, re.DOTALL)
step2_html = step2_match.group(1).strip()

# Extract the "Manifest" div
manifest_match = re.search(r'(<!-- ── RIGHT: Manifest ── -->.*?</div>\s*</div>)', trips_content, re.DOTALL)
manifest_html = manifest_match.group(1).strip()

# Make the ONLY change
manifest_html = manifest_html.replace('onClick={handleSubmit}', 'onClick={handleRestock}')
manifest_html = manifest_html.replace('disabled={manifest.length === 0 || !selectedVehicle || saving}', 'disabled={manifest.length === 0 || loading}')
manifest_html = manifest_html.replace('{saving ?', '{loading ?')
manifest_html = manifest_html.replace('Confirm Vehicle Load', 'Confirm Restock')


with open("app/stock/add/page.tsx", "r") as f:
    stock_content = f.read()

# Find where to replace
start_idx = stock_content.find('<!-- ── LEFT: Selection ── -->')
end_idx = stock_content.find(') : (\n                <div className="bg-white')

# Ensure we found them
if start_idx == -1 or end_idx == -1:
    print("Could not find replacement points")
    exit(1)

left_start = stock_content.find('<div className="lg:col-span-2 space-y-6 print:hidden">', start_idx) + len('<div className="lg:col-span-2 space-y-6 print:hidden">')

new_html = f"""
                    <!-- ── LEFT: Selection ── -->
                    <div className="lg:col-span-2 space-y-6 print:hidden">
                        {step2_html}
                    </div>

                    {manifest_html}
                </div>
"""

final_content = stock_content[:start_idx] + new_html.strip() + "\n            " + stock_content[end_idx:]

with open("app/stock/add/page.tsx", "w") as f:
    f.write(final_content)

print("Done replacing.")
