import { db } from "./db";
import { rolesPermissions, users } from "./schema";
import { eq, and } from "drizzle-orm";
import { AuditLogger } from "./audit-logger";

export interface Permission {
  role: string;
  permission: string;
  resource: string;
}

export interface RBACContext {
  userId: string;
  role?: string;
  permissions?: Permission[];
}

export class RBAC {
  /**
   * Check if a user has a specific permission for a resource
   */
  static async hasPermission(
    userId: string,
    permission: string,
    resource: string
  ): Promise<boolean> {
    try {
      // Get user's role
      const userResult = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.user_id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return false;
      }

      const userRole = userResult[0].role;

      // Check if role has the required permission
      const permissionResult = await db
        .select()
        .from(rolesPermissions)
        .where(
          and(
            eq(rolesPermissions.role, userRole),
            eq(rolesPermissions.permission, permission),
            eq(rolesPermissions.resource, resource)
          )
        )
        .limit(1);

      const hasPermission = permissionResult.length > 0;

      // Audit the permission check
      await AuditLogger.logSecurity(userId, 'permission_check', 'low', {
        permission,
        resource,
        role: userRole,
        granted: hasPermission,
      });

      return hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // Get user's role
      const userResult = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.user_id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return [];
      }

      const userRole = userResult[0].role;

      // Get all permissions for the role
      const permissions = await db
        .select()
        .from(rolesPermissions)
        .where(eq(rolesPermissions.role, userRole));

      return permissions;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has any of the specified permissions for a resource
   */
  static async hasAnyPermission(
    userId: string,
    permissions: string[],
    resource: string
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission, resource)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions for a resource
   */
  static async hasAllPermissions(
    userId: string,
    permissions: string[],
    resource: string
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission, resource))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get user's role
   */
  static async getUserRole(userId: string): Promise<string | null> {
    try {
      const userResult = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.user_id, userId))
        .limit(1);

      return userResult.length > 0 ? userResult[0].role : null;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return null;
    }
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === 'admin';
  }

  /**
   * Check if user is provider
   */
  static async isProvider(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === 'provider';
  }

  /**
   * Check if user is insurance
   */
  static async isInsurance(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === 'insurance';
  }

  /**
   * Check if user is intermediary
   */
  static async isIntermediary(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === 'intermediary';
  }

  /**
   * Middleware function for protecting routes with RBAC
   */
  static createMiddleware(
    requiredPermission: string,
    resource: string,
    options: {
      requireAll?: boolean;
      permissions?: string[];
      fallbackMessage?: string;
    } = {}
  ) {
    return async (userId: string): Promise<{ allowed: boolean; message?: string }> => {
      try {
        let hasAccess = false;

        if (options.permissions && options.permissions.length > 0) {
          if (options.requireAll) {
            hasAccess = await this.hasAllPermissions(userId, options.permissions, resource);
          } else {
            hasAccess = await this.hasAnyPermission(userId, options.permissions, resource);
          }
        } else {
          hasAccess = await this.hasPermission(userId, requiredPermission, resource);
        }

        if (!hasAccess) {
          const userRole = await this.getUserRole(userId);
          await AuditLogger.logSecurity(userId, 'access_denied', 'medium', {
            requiredPermission,
            resource,
            userRole,
            permissions: options.permissions,
            requireAll: options.requireAll,
          });
        }

        return {
          allowed: hasAccess,
          message: hasAccess ? undefined : (options.fallbackMessage || 'Access denied'),
        };
      } catch (error) {
        console.error('RBAC middleware error:', error);
        return {
          allowed: false,
          message: 'Authorization check failed',
        };
      }
    };
  }

  /**
   * Initialize default role permissions
   */
  static async initializeDefaultPermissions(): Promise<void> {
    try {
      const defaultPermissions = [
        // Admin permissions
        { role: 'admin', permission: 'read', resource: 'audit_logs' },
        { role: 'admin', permission: 'read', resource: 'security_events' },
        { role: 'admin', permission: 'read', resource: 'user_data' },
        { role: 'admin', permission: 'write', resource: 'user_data' },
        { role: 'admin', permission: 'delete', resource: 'user_data' },
        { role: 'admin', permission: 'manage', resource: 'system' },

        // Provider permissions
        { role: 'provider', permission: 'read', resource: 'own_data' },
        { role: 'provider', permission: 'write', resource: 'own_data' },
        { role: 'provider', permission: 'read', resource: 'services' },
        { role: 'provider', permission: 'write', resource: 'services' },
        { role: 'provider', permission: 'read', resource: 'transactions' },
        { role: 'provider', permission: 'read', resource: 'certificates' },

        // Insurance permissions
        { role: 'insurance', permission: 'read', resource: 'own_data' },
        { role: 'insurance', permission: 'write', resource: 'own_data' },
        { role: 'insurance', permission: 'read', resource: 'services' },
        { role: 'insurance', permission: 'read', resource: 'transactions' },
        { role: 'insurance', permission: 'write', resource: 'transactions' },
        { role: 'insurance', permission: 'read', resource: 'certificates' },

        // Intermediary permissions
        { role: 'intermediary', permission: 'read', resource: 'own_data' },
        { role: 'intermediary', permission: 'write', resource: 'own_data' },
        { role: 'intermediary', permission: 'read', resource: 'services' },
        { role: 'intermediary', permission: 'read', resource: 'marketplace' },
        { role: 'intermediary', permission: 'write', resource: 'marketplace' },
        { role: 'intermediary', permission: 'read', resource: 'transactions' },
      ];

      for (const perm of defaultPermissions) {
        // Check if permission already exists
        const existing = await db
          .select()
          .from(rolesPermissions)
          .where(
            and(
              eq(rolesPermissions.role, perm.role),
              eq(rolesPermissions.permission, perm.permission),
              eq(rolesPermissions.resource, perm.resource)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(rolesPermissions).values(perm);
        }
      }

      console.log('Default RBAC permissions initialized');
    } catch (error) {
      console.error('Failed to initialize default permissions:', error);
      throw new Error('Failed to initialize default permissions');
    }
  }

  /**
   * Add custom permission for a role
   */
  static async addPermission(
    role: string,
    permission: string,
    resource: string
  ): Promise<void> {
    try {
      // Check if permission already exists
      const existing = await db
        .select()
        .from(rolesPermissions)
        .where(
          and(
            eq(rolesPermissions.role, role),
            eq(rolesPermissions.permission, permission),
            eq(rolesPermissions.resource, resource)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(rolesPermissions).values({
          role,
          permission,
          resource,
        });

        await AuditLogger.logSecurity(undefined, 'permission_added', 'low', {
          role,
          permission,
          resource,
        });
      }
    } catch (error) {
      console.error('Failed to add permission:', error);
      throw new Error('Failed to add permission');
    }
  }

  /**
   * Remove permission from a role
   */
  static async removePermission(
    role: string,
    permission: string,
    resource: string
  ): Promise<void> {
    try {
      await db
        .delete(rolesPermissions)
        .where(
          and(
            eq(rolesPermissions.role, role),
            eq(rolesPermissions.permission, permission),
            eq(rolesPermissions.resource, resource)
          )
        );

      await AuditLogger.logSecurity(undefined, 'permission_removed', 'medium', {
        role,
        permission,
        resource,
      });
    } catch (error) {
      console.error('Failed to remove permission:', error);
      throw new Error('Failed to remove permission');
    }
  }

  /**
   * Get all roles and their permissions
   */
  static async getAllRolesAndPermissions(): Promise<Record<string, Permission[]>> {
    try {
      const allPermissions = await db.select().from(rolesPermissions);

      const rolesMap: Record<string, Permission[]> = {};

      allPermissions.forEach(perm => {
        if (!rolesMap[perm.role]) {
          rolesMap[perm.role] = [];
        }
        rolesMap[perm.role].push(perm);
      });

      return rolesMap;
    } catch (error) {
      console.error('Failed to get roles and permissions:', error);
      return {};
    }
  }
}