# Phase 11 — Eventos de recepción (Backend)

**Status: Pending — awaiting the "6. Eventos de recepción" Dataico reference.**

## Goal

Keep this system's record of an invoice's DIAN status accurate without an admin having to check Dataico's own portal by hand.

## Scope (high-level — firms up once the reference is shared)

- [ ] `invoicing/reception-events/` module
- [ ] Determine the actual mechanism from the reference: an inbound webhook this API must expose and secure (signature verification, same category of concern as any inbound webhook), or an outbound polling query against Dataico
- [ ] Update the local invoice record's status when a reception/acceptance/rejection event is received
- [ ] Surface a rejected/disputed invoice clearly to the admin — this is the kind of failure that needs a human to act on, not just a log line

## Explicitly blocked on

Whether this is push (webhook) or pull (polling), the event payload shape, and — if a webhook — how to verify it actually came from Dataico.

## Exit criteria

An invoice's status shown in this app matches its real DIAN status without manual cross-checking.

## Related documents

- `docs/phasesClient/PHASE_11_RECEPTION_EVENTS.md`, `docs/GLOSSARY.md` ("Eventos de recepción")
