import { describe, expect, it } from 'vitest';
import { RoleHierarchyPolicy } from '../role-hierarchy.policy';
import { UserRole } from '../../entities/user.entity';

describe('RoleHierarchyPolicy', () => {
  describe('canCreateRole', () => {
    it('SUPER_ADMIN can create FLEET_MANAGER, ADMIN, DRIVER', () => {
      const sa = { id: 'sa-1', role: UserRole.SUPER_ADMIN, clientId: null };
      expect(RoleHierarchyPolicy.canCreateRole(sa, UserRole.FLEET_MANAGER)).toBe(true);
      expect(RoleHierarchyPolicy.canCreateRole(sa, UserRole.ADMIN)).toBe(true);
      expect(RoleHierarchyPolicy.canCreateRole(sa, UserRole.DRIVER)).toBe(true);
      expect(RoleHierarchyPolicy.canCreateRole(sa, UserRole.SUPER_ADMIN)).toBe(false);
    });

    it('FLEET_MANAGER can only create ADMIN and DRIVER', () => {
      const fm = { id: 'fm-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canCreateRole(fm, UserRole.ADMIN)).toBe(true);
      expect(RoleHierarchyPolicy.canCreateRole(fm, UserRole.DRIVER)).toBe(true);
      expect(RoleHierarchyPolicy.canCreateRole(fm, UserRole.FLEET_MANAGER)).toBe(false);
      expect(RoleHierarchyPolicy.canCreateRole(fm, UserRole.SUPER_ADMIN)).toBe(false);
    });

    it('ADMIN and DRIVER cannot create any role', () => {
      const admin = { id: 'ad-1', role: UserRole.ADMIN, clientId: 'client-1' };
      const driver = { id: 'dr-1', role: UserRole.DRIVER, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canCreateRole(admin, UserRole.DRIVER)).toBe(false);
      expect(RoleHierarchyPolicy.canCreateRole(driver, UserRole.DRIVER)).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    it('should return false if user attempts to change own role (prevent self-escalation)', () => {
      const fm = { id: 'user-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canAssignRole(fm, fm, UserRole.SUPER_ADMIN)).toBe(false);
    });

    it('should return false if non-SUPER_ADMIN accesses different client', () => {
      const fm = { id: 'actor-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      const adminOtherClient = { id: 'target-1', role: UserRole.ADMIN, clientId: 'client-2' };
      expect(RoleHierarchyPolicy.canAssignRole(fm, adminOtherClient, UserRole.DRIVER)).toBe(false);
    });

    it('FLEET_MANAGER can change ADMIN to DRIVER within same client', () => {
      const fm = { id: 'actor-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      const admin = { id: 'target-1', role: UserRole.ADMIN, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canAssignRole(fm, admin, UserRole.DRIVER)).toBe(true);
    });

    it('FLEET_MANAGER cannot elevate someone to FLEET_MANAGER or SUPER_ADMIN', () => {
      const fm = { id: 'actor-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      const admin = { id: 'target-1', role: UserRole.ADMIN, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canAssignRole(fm, admin, UserRole.FLEET_MANAGER)).toBe(false);
      expect(RoleHierarchyPolicy.canAssignRole(fm, admin, UserRole.SUPER_ADMIN)).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('SUPER_ADMIN can manage any user', () => {
      const sa = { id: 'sa-1', role: UserRole.SUPER_ADMIN, clientId: null };
      const target = { id: 'target-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canManageUser(sa, target)).toBe(true);
    });

    it('FLEET_MANAGER can manage subordinate ADMIN and DRIVER in same client', () => {
      const fm = { id: 'fm-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      const admin = { id: 'ad-1', role: UserRole.ADMIN, clientId: 'client-1' };
      const driver = { id: 'dr-1', role: UserRole.DRIVER, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canManageUser(fm, admin)).toBe(true);
      expect(RoleHierarchyPolicy.canManageUser(fm, driver)).toBe(true);
    });

    it('FLEET_MANAGER cannot manage users from another client', () => {
      const fm = { id: 'fm-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      const adminOther = { id: 'ad-2', role: UserRole.ADMIN, clientId: 'client-2' };
      expect(RoleHierarchyPolicy.canManageUser(fm, adminOther)).toBe(false);
    });

    it('FLEET_MANAGER cannot manage self via administrative endpoint', () => {
      const fm = { id: 'fm-1', role: UserRole.FLEET_MANAGER, clientId: 'client-1' };
      expect(RoleHierarchyPolicy.canManageUser(fm, fm)).toBe(false);
    });
  });
});
