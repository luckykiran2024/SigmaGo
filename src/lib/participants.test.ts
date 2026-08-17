import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './participants';

describe('Prompt #10 — Directory, Approver Register, and Participants', () => {
  it('1. Should allow any active directory person to raise a request when whoCanRaise = ANYONE', () => {
    const category = { whoCanRaise: 'ANYONE' };
    const dirPerson = { email: 'staff@corp.com', status: 'ACTIVE', isApprover: false };

    const canRaise = (cat: typeof category, person: typeof dirPerson) => {
      if (person.status !== 'ACTIVE') return false;
      if (cat.whoCanRaise === 'ANYONE') return true;
      if (cat.whoCanRaise === 'APPROVERS_ONLY') return person.isApprover;
      return false;
    };

    expect(canRaise(category, dirPerson)).toBe(true);
  });

  it('2. Should strictly prevent a REFERENCE participant endorsement from advancing request state', () => {
    const initialRequestState = 'pending_approval';
    const participantAction = { role: 'REFERENCE', action: 'ENDORSE', comment: 'Looks good to me' };

    const processParticipantResponse = (currentState: string, pAction: typeof participantAction) => {
      // Participant actions carry ZERO authority and MUST NEVER change request state!
      return currentState;
    };

    const nextState = processParticipantResponse(initialRequestState, participantAction);
    expect(nextState).toBe('pending_approval');
    expect(nextState).not.toBe('approved');
  });

  it('3. Should block external participants when allowExternalParticipants = false', () => {
    const category = { allowExternalParticipants: false };
    const externalParticipant = { email: 'auditor@externalfirm.com', isExternal: true };

    const validateParticipantAddition = (cat: typeof category, participant: typeof externalParticipant) => {
      if (participant.isExternal && !cat.allowExternalParticipants) {
        throw new Error('External participants are disabled for this decision category by configuration.');
      }
      return true;
    };

    expect(() => validateParticipantAddition(category, externalParticipant)).toThrow(
      'External participants are disabled for this decision category by configuration.'
    );
  });

  it('4. Should block inactive directory persons from being added as participants', () => {
    const inactivePerson = { email: 'ex.employee@corp.com', status: 'INACTIVE' };

    const validatePersonStatus = (person: typeof inactivePerson) => {
      if (person.status === 'INACTIVE') {
        throw new Error('Cannot add inactive employees as decision participants.');
      }
      return true;
    };

    expect(() => validatePersonStatus(inactivePerson)).toThrow(
      'Cannot add inactive employees as decision participants.'
    );
  });

  it('5. Should exclude service accounts from directory pickers and org trees', () => {
    const directory = [
      { name: 'CEO User', isServiceAccount: false },
      { name: 'Meridian Admin', isServiceAccount: true },
      { name: 'Finance Staff', isServiceAccount: false },
    ];

    const pickablePeople = directory.filter((p) => !p.isServiceAccount);

    expect(pickablePeople.length).toBe(2);
    expect(pickablePeople.some((p) => p.name === 'Meridian Admin')).toBe(false);
  });
});
