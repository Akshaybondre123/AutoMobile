import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import UserRoleMapping from "../models/UserRoleMapping.js";
import RolePermissionMapping from "../models/RolePermissionMapping.js";

/**
 * Get all permissions for a user by traversing the RBAC chain
 * User → User_Role_Mapping → Roles → Role_Permission_Mapping → Permissions
 */
export const getUserPermissions = async (userId) => {
  try {
    // Step 1: Get all roles assigned to the user
    const userRoles = await UserRoleMapping.find({ user_id: userId })
      .populate("role_id")
      .lean();

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.role_id._id);

    // Step 2: Get all permissions for these roles
    const rolePermissions = await RolePermissionMapping.find({
      role_id: { $in: roleIds }
    })
      .populate("permission_id")
      .lean();

    // Step 3: Extract unique permissions with meta data
    const permissionsMap = new Map();

    rolePermissions.forEach((rp) => {
      const permissionKey = rp.permission_id.permission_key;
      const metaValue = rp.meta;
      const metaArr = metaValue ? [metaValue] : [];
      
      if (!permissionsMap.has(permissionKey)) {
        permissionsMap.set(permissionKey, {
          id: rp.permission_id._id,
          permission_key: rp.permission_id.permission_key,
          name: rp.permission_id.name,
          ...(metaArr.length > 0 ? { meta: metaArr } : {})
        });
      } else {
        // If permission exists from another role, merge meta (skip null/undefined)
        const existing = permissionsMap.get(permissionKey);
        if (metaValue) {
          if (!existing.meta) existing.meta = [];
          existing.meta.push(metaValue);
        }
      }
    });

    return Array.from(permissionsMap.values());
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    throw error;
  }
};

/**
 * Get all roles for a user
 */
export const getUserRoles = async (userId) => {
  try {
    const userRoles = await UserRoleMapping.find({ user_id: userId })
      .populate("role_id")
      .lean();

    const roles = userRoles.map((ur) => ur.role_id);
    
    // Sort roles by priority: Owner > Service_Manager > Service_Advisor
    // This ensures the primary role returned to the frontend is the most privileged one assigned
    const rolePriority = {
      'owner': 0,
      'Owner': 0,
      'service_manager': 1,
      'Service_Manager': 1,
      'service_advisor': 2,
      'Service_Advisor': 2,
    };
    
    roles.sort((a, b) => {
      const priorityA = rolePriority[a.name] ?? 999;
      const priorityB = rolePriority[b.name] ?? 999;
      return priorityA - priorityB;
    });
    
    return roles;
  } catch (error) {
    console.error("Error fetching user roles:", error);
    throw error;
  }
};

/**
 * Assign a role to a user
 */
export const assignRoleToUser = async (userId, roleId, assignedBy, showroomId) => {
  try {
    // Determine showroom context: explicit param > role.showroom_id > env default
    let showroomForMapping = showroomId;
    if (!showroomForMapping) {
      const role = await Role.findById(roleId).lean();
      showroomForMapping = (role && role.showroom_id) || process.env.DEFAULT_SHOWROOM_ID || undefined;
    }

    // Check if mapping already exists (within same showroom)
    const existingQuery = { user_id: userId, role_id: roleId };
    if (showroomForMapping) existingQuery.showroom_id = showroomForMapping;
    const existing = await UserRoleMapping.findOne(existingQuery);

    if (existing) {
      throw new Error("Role already assigned to user");
    }

    const mapping = new UserRoleMapping({
      user_id: userId,
      role_id: roleId,
      showroom_id: showroomForMapping,
      created_by: assignedBy,
      updated_by: assignedBy
    });

    await mapping.save();
    return mapping;
  } catch (error) {
    console.error("Error assigning role to user:", error);
    throw error;
  }
};

/**
 * Remove a role from a user
 */
export const removeRoleFromUser = async (userId, roleId) => {
  try {
    const result = await UserRoleMapping.findOneAndDelete({
      user_id: userId,
      role_id: roleId
    });

    if (!result) {
      throw new Error("Role assignment not found");
    }

    return result;
  } catch (error) {
    console.error("Error removing role from user:", error);
    throw error;
  }
};

/**
 * Assign a permission to a role
 */
export const assignPermissionToRole = async (roleId, permissionId, meta = {}, assignedBy) => {
  try {
    // Determine showroom context from the role (preferred) or fallback to default env
    const role = await Role.findById(roleId).lean();
    const showroomIdForMapping = (role && role.showroom_id) || process.env.DEFAULT_SHOWROOM_ID || undefined;

    // Check if mapping already exists (within the same showroom)
    const existingQuery = { role_id: roleId, permission_id: permissionId };
    if (showroomIdForMapping) existingQuery.showroom_id = showroomIdForMapping;
    const existing = await RolePermissionMapping.findOne(existingQuery);

    if (existing) {
      // Update meta if exists
      existing.meta = meta;
      existing.updated_by = assignedBy;
      // ensure showroom_id is present on existing mapping
      if (!existing.showroom_id && showroomIdForMapping) existing.showroom_id = showroomIdForMapping;
      await existing.save();
      return existing;
    }

    // Create new mapping with showroom context
    const mapping = new RolePermissionMapping({
      role_id: roleId,
      permission_id: permissionId,
      showroom_id: showroomIdForMapping,
      meta: meta,
      created_by: assignedBy,
      updated_by: assignedBy
    });

    await mapping.save();
    return mapping;
  } catch (error) {
    console.error("Error assigning permission to role:", error);
    throw error;
  }
};

/**
 * Remove a permission from a role
 */
export const removePermissionFromRole = async (roleId, permissionId) => {
  try {
    const result = await RolePermissionMapping.findOneAndDelete({
      role_id: roleId,
      permission_id: permissionId
    });

    if (!result) {
      throw new Error("Permission assignment not found");
    }

    return result;
  } catch (error) {
    console.error("Error removing permission from role:", error);
    throw error;
  }
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = async (roleId) => {
  try {
    const rolePermissions = await RolePermissionMapping.find({ role_id: roleId })
      .populate("permission_id")
      .lean();

    return rolePermissions.map((rp) => ({
      ...rp.permission_id,
      meta: rp.meta
    }));
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    throw error;
  }
};

/**
 * Check if user has a specific permission
 */
export const userHasPermission = async (userId, permissionKey) => {
  try {
    const permissions = await getUserPermissions(userId);
    return permissions.some((p) => p.permission_key === permissionKey);
  } catch (error) {
    console.error("Error checking user permission:", error);
    throw error;
  }
};
