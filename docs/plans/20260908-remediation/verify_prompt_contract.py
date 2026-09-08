"""Verify the shipped prompt contract; this does not certify a product release."""
from pathlib import Path
import hashlib
import json

PACK = Path(__file__).resolve().parent
HEADER = "## Mandatory release, operational closeout and skill evolution — contract v2"
END = "## Captured issue requirements — refresh before acting"

def errors_for(text, manifest):
    errors = []
    if text.count(HEADER) != 1 or END not in text:
        return ["missing/duplicate release contract or captured-issue boundary"]
    block = text[text.index(HEADER):text.index(END)].rstrip() + "\n"
    if hashlib.sha256(block.encode()).hexdigest() != manifest["contract_sha256"]:
        errors.append("embedded contract differs from canonical version")
    offsets = [block.find("**" + stage + ":**") for stage in manifest["stages"]]
    if any(i < 0 for i in offsets) or offsets != sorted(offsets):
        errors.append("release states missing or out of order")
    for skill in manifest["required_skills"]:
        if skill not in block:
            errors.append("missing required skill: " + skill)
        if not (Path("/home/braden/.agents/skills") / skill / "SKILL.md").is_file():
            errors.append("unresolved canonical skill: " + skill)
    return errors

def main():
    manifest = json.loads((PACK / "evidence/release-contract-manifest.json").read_text())
    prompts = sorted((PACK / "prompts").glob("*.md"))
    results = {p.name: errors_for(p.read_text(), manifest) for p in prompts}
    errors = {k: v for k, v in results.items() if v}
    assert len(prompts) == manifest["prompt_count"] == 332
    canonical = (PACK / "release-contract.md").read_text().split(HEADER, 1)[1]
    canonical = HEADER + canonical
    assert hashlib.sha256(canonical.encode()).hexdigest() == manifest["contract_sha256"]
    # Negative controls: dropping production or a required skill must fail.
    sample = prompts[0].read_text()
    controls = {
        "production_phase_removed": bool(errors_for(sample.replace("**PRODUCTION_VERIFIED:**", "**OMITTED:**"), manifest)),
        "ops_closeout_removed": bool(errors_for(sample.replace("ops-ship-close-out", "omitted-closeout"), manifest)),
        "contract_absent": bool(errors_for(sample.replace(HEADER, "omitted contract"), manifest)),
        "valid_prompt_passes": not errors_for(sample, manifest),
    }
    assert all(controls.values()), controls
    report = {"version": 2, "prompt_count": len(prompts), "errors": errors, "negative_controls": controls,
              "scope": "Instruction presence/integrity and skill paths only; actual runtime evidence is required by existing DoD gates."}
    (PACK / "evidence/release-contract-verification.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    assert not errors

if __name__ == "__main__":
    main()
