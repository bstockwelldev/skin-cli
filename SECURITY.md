# Security policy

## Reporting

[GitHub private vulnerability reporting](https://github.com/bstockwelldev/skin-cli/security/advisories/new).

## Notes

The CLI edits local project files when explicitly invoked. Review diffs and use **`--dry-run`**. Supply-chain risk is concentrated in **`commander`** and Node stdlib — track dependencies and lockfile hygiene.
