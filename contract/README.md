# contract/

`openapi.yaml` (OpenAPI 3.1) lives here and is the **single source of truth** for the Medicub API.

It does not exist yet. The **contract agent** creates it at milestone M0 from `docs/05-api-contract.md`, in the versions listed in `docs/08-agent-playbook.md` (v0.1 → v0.4).

Rules:
- Only the contract agent edits files here, and only after the human lead approves a change.
- Field names, enums, and nullability must match `docs/04-data-model.md` and `docs/05-api-contract.md`.
- Tag every change `contract-vX.Y`.
