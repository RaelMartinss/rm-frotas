import { UserRole } from '../entities/user.entity';

export interface UserContext {
  id: string;
  role: UserRole;
  clientId?: string | null;
}

export class RoleHierarchyPolicy {
  /**
   * Verifica se o solicitante tem permissão para criar um usuário com determinado papel.
   */
  static canCreateRole(requester: UserContext, targetRole: UserRole): boolean {
    if (requester.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN pode criar FLEET_MANAGER durante o onboarding ou administrativamente
      return targetRole === UserRole.FLEET_MANAGER || targetRole === UserRole.ADMIN || targetRole === UserRole.DRIVER;
    }

    if (requester.role === UserRole.FLEET_MANAGER) {
      // FLEET_MANAGER só pode criar ADMIN e DRIVER para seu próprio cliente
      return targetRole === UserRole.ADMIN || targetRole === UserRole.DRIVER;
    }

    return false;
  }

  /**
   * Verifica se o solicitante pode alterar o papel de um usuário existente para um novo papel.
   */
  static canAssignRole(
    requester: UserContext,
    targetUser: UserContext,
    newRole: UserRole,
  ): boolean {
    // Não pode alterar o próprio papel (Self role escalation prevention)
    if (requester.id === targetUser.id) {
      return false;
    }

    if (requester.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (requester.role === UserRole.FLEET_MANAGER) {
      // Deve ser do mesmo cliente
      if (!requester.clientId || requester.clientId !== targetUser.clientId) {
        return false;
      }
      // O usuário alvo deve ser ADMIN ou DRIVER
      if (targetUser.role !== UserRole.ADMIN && targetUser.role !== UserRole.DRIVER) {
        return false;
      }
      // O novo papel só pode ser ADMIN ou DRIVER
      return newRole === UserRole.ADMIN || newRole === UserRole.DRIVER;
    }

    return false;
  }

  /**
   * Verifica se o solicitante tem permissão para gerenciar (ativar/desativar, resetar senha) um determinado usuário alvo.
   */
  static canManageUser(requester: UserContext, targetUser: UserContext): boolean {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (requester.role === UserRole.FLEET_MANAGER) {
      // Não pode resetar/gerenciar a si mesmo via endpoint administrativo de terceiros
      if (requester.id === targetUser.id) {
        return false;
      }
      // Deve ser do mesmo cliente
      if (!requester.clientId || requester.clientId !== targetUser.clientId) {
        return false;
      }
      // Só pode gerenciar subordinados (ADMIN e DRIVER)
      return targetUser.role === UserRole.ADMIN || targetUser.role === UserRole.DRIVER;
    }

    return false;
  }
}
