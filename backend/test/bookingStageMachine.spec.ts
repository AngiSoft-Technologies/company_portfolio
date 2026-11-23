import { describe, expect, it } from 'vitest';

import {
    ADDITIONAL_KNOWN_STAGES,
    BOOKING_STATUSES,
    CANCELLABLE_STAGES,
    STAGE_ACTIONS,
    STAGE_FLOW,
    STAGE_ORDER,
    STATUS_TO_STAGE,
    availableActions,
    canCancel,
    customerActionStage,
    isKnownStage,
    isLegalStageTransition,
    stageForStatus,
    stageProgress,
} from '../src/modules/bookings/services/bookingStageMachine';

/**
 * Unit specs for the extracted booking stage machine. The machine is pure —
 * no Prisma/Express imports — so every rule can be checked without a database.
 */

describe('booking stage machine — vocabulary', () => {
    it('preserves the canonical workflow order', () => {
        expect(STAGE_ORDER).toEqual([
            'request_submitted',
            'requirements_review',
            'clarification_needed',
            'scope_and_quotation',
            'awaiting_confirmation',
            'scheduled',
            'in_progress',
            'customer_review',
            'completed',
        ]);
    });

    it('has an explicit transition entry for every reachable stage', () => {
        const allStages = [...STAGE_ORDER, ...ADDITIONAL_KNOWN_STAGES, 'changes_requested'];
        for (const stage of allStages) {
            expect(STAGE_FLOW, `missing transition row for ${stage}`).toHaveProperty(stage);
        }
        expect(Object.keys(STAGE_FLOW).sort()).toEqual([...allStages].sort());
    });

    it('recognises only canonical stages plus rejected/cancelled', () => {
        for (const stage of [...STAGE_ORDER, ...ADDITIONAL_KNOWN_STAGES]) {
            expect(isKnownStage(stage)).toBe(true);
        }
        expect(isKnownStage('changes_requested')).toBe(false); // reached via action, not admin stage PATCH
        expect(isKnownStage('nonsense')).toBe(false);
        expect(isKnownStage(undefined as any)).toBe(false);
    });

    it('keeps the status vocabulary and its stage mapping', () => {
        expect(BOOKING_STATUSES).toHaveLength(10);
        expect(STATUS_TO_STAGE).toEqual({
            SUBMITTED: 'request_submitted',
            UNDER_REVIEW: 'requirements_review',
            ACCEPTED: 'awaiting_confirmation',
            REJECTED: 'rejected',
            TERMS_ACCEPTED: 'scheduled',
            DEPOSIT_PAID: 'scheduled',
            IN_PROGRESS: 'in_progress',
            DELIVERED: 'customer_review',
            COMPLETED: 'completed',
            CANCELLED: 'cancelled',
        });
        expect(stageForStatus('ACCEPTED', 'request_submitted')).toBe('awaiting_confirmation');
        expect(stageForStatus('DEPOSIT_PAID', 'awaiting_confirmation')).toBe('scheduled');
        // An unmapped status leaves the current stage untouched.
        expect(stageForStatus('UNKNOWN' as any, 'in_progress')).toBe('in_progress');
    });
});

describe('booking stage machine — transitions', () => {
    it('allows every edge declared in the transition table', () => {
        let edges = 0;
        for (const [from, targets] of Object.entries(STAGE_FLOW)) {
            for (const to of targets) {
                edges += 1;
                expect(isLegalStageTransition(from, to), `${from} -> ${to}`).toBe(true);
            }
        }
        expect(edges).toBeGreaterThanOrEqual(15);
    });

    it.each([
        ['request_submitted', 'requirements_review'],
        ['request_submitted', 'cancelled'],
        ['requirements_review', 'clarification_needed'],
        ['requirements_review', 'scope_and_quotation'],
        ['requirements_review', 'rejected'],
        ['clarification_needed', 'requirements_review'],
        ['clarification_needed', 'scope_and_quotation'],
        ['scope_and_quotation', 'awaiting_confirmation'],
        ['awaiting_confirmation', 'scheduled'],
        ['scheduled', 'in_progress'],
        ['scheduled', 'cancelled'],
        ['in_progress', 'customer_review'],
        ['customer_review', 'completed'],
        ['customer_review', 'changes_requested'],
        ['changes_requested', 'in_progress'],
    ])('accepts %s -> %s', (from, to) => {
        expect(isLegalStageTransition(from, to)).toBe(true);
    });

    it.each([
        ['request_submitted', 'scheduled'],
        ['request_submitted', 'completed'],
        ['requirements_review', 'awaiting_confirmation'],
        ['clarification_needed', 'in_progress'],
        ['scope_and_quotation', 'customer_review'],
        ['awaiting_confirmation', 'in_progress'],
        ['scheduled', 'customer_review'],
        ['in_progress', 'completed'],
        ['customer_review', 'cancelled'],
        ['changes_requested', 'completed'],
        ['completed', 'customer_review'],
        ['cancelled', 'request_submitted'],
        ['rejected', 'requirements_review'],
        ['request_submitted', 'changes_requested'],
        ['nonsense', 'scheduled'],
        ['request_submitted', 'nonsense'],
    ])('rejects illegal %s -> %s', (from, to) => {
        expect(isLegalStageTransition(from, to)).toBe(false);
    });

    it('allows no-op transitions for all stages, including terminal ones', () => {
        const allStages = [...STAGE_ORDER, ...ADDITIONAL_KNOWN_STAGES, 'changes_requested'];
        for (const stage of allStages) {
            expect(isLegalStageTransition(stage, stage), `${stage} -> ${stage}`).toBe(true);
        }
        // Preserved behaviour: an unknown stage compared to itself is also a no-op.
        expect(isLegalStageTransition('nonsense', 'nonsense')).toBe(true);
    });

    it('keeps terminal stages terminal', () => {
        expect(STAGE_FLOW.completed).toEqual([]);
        expect(STAGE_FLOW.cancelled).toEqual([]);
        expect(STAGE_FLOW.rejected).toEqual([]);
    });
});

describe('booking stage machine — derived workflow metadata', () => {
    it('exposes the same customer actions per stage as before extraction', () => {
        expect(STAGE_ACTIONS).toEqual({
            request_submitted: ['UPLOAD_FILES'],
            requirements_review: ['UPLOAD_FILES', 'RESPOND_TO_CLARIFICATION'],
            clarification_needed: ['UPLOAD_FILES', 'RESPOND_TO_CLARIFICATION'],
            scope_and_quotation: ['UPLOAD_FILES'],
            awaiting_confirmation: ['ACCEPT_QUOTATION', 'DECLINE_QUOTATION', 'UPLOAD_FILES'],
            scheduled: ['UPLOAD_FILES', 'CANCEL_BOOKING'],
            in_progress: ['UPLOAD_FILES', 'REQUEST_CHANGES', 'CANCEL_BOOKING'],
            customer_review: ['CONFIRM_DELIVERY', 'REQUEST_CHANGES'],
            changes_requested: ['UPLOAD_FILES'],
            completed: [],
            cancelled: [],
            rejected: [],
        });
        expect(availableActions('awaiting_confirmation')).toEqual([
            'ACCEPT_QUOTATION', 'DECLINE_QUOTATION', 'UPLOAD_FILES',
        ]);
        expect(availableActions('unknown')).toEqual([]);
    });

    it('permits customer cancellation only from active stages', () => {
        expect(CANCELLABLE_STAGES).toEqual([
            'request_submitted', 'requirements_review', 'clarification_needed',
            'scope_and_quotation', 'awaiting_confirmation', 'scheduled', 'in_progress',
        ]);
        for (const stage of CANCELLABLE_STAGES) expect(canCancel(stage)).toBe(true);
        for (const stage of ['customer_review', 'changes_requested', 'completed', 'cancelled', 'rejected']) {
            expect(canCancel(stage)).toBe(false);
        }
    });

    it('computes stage progress exactly as the serializer did inline', () => {
        expect(stageProgress('scheduled')).toEqual({ order: STAGE_ORDER, currentIndex: 5 });
        expect(stageProgress('request_submitted')).toEqual({ order: STAGE_ORDER, currentIndex: 0 });
        expect(stageProgress('completed')).toEqual({ order: STAGE_ORDER, currentIndex: 8 });
        // Non-linear stages were index -1 before the extraction too.
        expect(stageProgress('changes_requested').currentIndex).toBe(-1);
    });

    it('maps customer actions to the same target stages', () => {
        expect(customerActionStage('ACCEPT_QUOTATION', 'awaiting_confirmation')).toBe('scheduled');
        expect(customerActionStage('DECLINE_QUOTATION', 'awaiting_confirmation')).toBe('scope_and_quotation');
        expect(customerActionStage('REQUEST_CHANGES', 'in_progress')).toBe('changes_requested');
        expect(customerActionStage('REQUEST_CHANGES', 'customer_review')).toBe('changes_requested');
        expect(customerActionStage('CONFIRM_DELIVERY', 'customer_review')).toBe('completed');
        // UPLOAD_FILES/RESPOND_TO_CLARIFICATION and unknown actions are stage no-ops.
        expect(customerActionStage('UPLOAD_FILES', 'scheduled')).toBe('scheduled');
        expect(customerActionStage('WHATEVER', 'in_progress')).toBe('in_progress');
    });

    it('maps every customer action to a stage the machine knows about', () => {
        const actionTargets = new Set(
            Object.values(STAGE_ACTIONS).flat().map((action) => customerActionStage(action, 'request_submitted')),
        );
        for (const target of actionTargets) {
            expect(isKnownStage(target) || target === 'changes_requested').toBe(true);
        }
    });
});
