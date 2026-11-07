# Project architecture rules

- Keep industry definitions in a database-backed configuration registry with code defaults, and keep industry feature allowlists separate from plan entitlements; effective access is their intersection so new sectors and plan tiers can be managed without redeploying the frontend.