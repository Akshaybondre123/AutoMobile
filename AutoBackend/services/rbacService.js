import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import UserRoleMapping from "../models/UserRoleMapping.js";
import RolePermissionMapping from "../models/RolePermissionMapping.js";

/**
 * Check if user has Owner role
 */
const isOwner = (roles) => {
  if (!roles || roles.length === 0) return false;
  const roleNames = roles.map(role => {
    const name = (role.name || '').toString().toLowerCase().trim();
    return name;
  });
  return roleNames.some(name => 
    name === 'owner' || 
    name === 'general_manager' || 
    name === 'general manager' ||
    name.includes('owner')
  );
};

/**
 * Get all GM permissions that should be automatically granted to owners
 * These permissions give owners access to:
 * - GM Dashboard (overview, targets)
 * - User Access Management (manage_users, manage_roles)
 */
const getOwnerGMPermissions = async () => {
  try {
    // List of GM permission keys that owners should always have
    // Note: Some permissions might not exist in DB yet, so we fetch what's available
    const ownerPermissionKeys = [
      'gm_dashboard',      // GM Dashboard access
      'overview',          // Overview page
      'manage_users',      // User Access Management
      'manage_roles',      // Role Management
      'gm_targets'         // GM Targets (if exists)
    ];

    // Fetch these permissions from the database (only those that exist)
    const permissions = await Permission.find({
      permission_key: { $in: ownerPermissionKeys }
    }).lean();

    console.log(`📋 Found ${permissions.length} GM permissions for owner out of ${ownerPermissionKeys.length} requested`);

    // If no permissions found in DB, create fallback permissions
    // This ensures owners always have at least basic GM access
    if (permissions.length === 0) {
      console.log(`⚠️ No GM permissions found in DB for owner, creating fallback permissions`);
      return [
        { id: 'fallback_overview', permission_key: 'overview', name: 'Overview' },
        { id: 'fallback_manage_users', permission_key: 'manage_users', name: 'Manage Users' },
        { id: 'fallback_manage_roles', permission_key: 'manage_roles', name: 'Manage Roles' }
      ];
    }

    // Return in the same format as getUserPermissions
    const mappedPermissions = permissions.map(perm => ({
      id: perm._id,
      permission_key: perm.permission_key,
      name: perm.name
    }));

    // Ensure we have at least overview, manage_users, and manage_roles
    const requiredKeys = ['overview', 'manage_users', 'manage_roles'];
    const existingKeys = mappedPermissions.map(p => p.permission_key);
    const missingKeys = requiredKeys.filter(key => !existingKeys.includes(key));

    if (missingKeys.length > 0) {
      console.log(`⚠️ Missing required GM permissions for owner: ${missingKeys.join(', ')}, adding fallbacks`);
      missingKeys.forEach(key => {
        mappedPermissions.push({
          id: `fallback_${key}`,
          permission_key: key,
          name: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        });
      });
    }

    return mappedPermissions;
  } catch (error) {
    console.error("Error fetching owner GM permissions:", error);
    // Return fallback permissions even on error
    return [
      { id: 'fallback_overview', permission_key: 'overview', name: 'Overview' },
      { id: 'fallback_manage_users', permission_key: 'manage_users', name: 'Manage Users' },
      { id: 'fallback_manage_roles', permission_key: 'manage_roles', name: 'Manage Roles' }
    ];
  }
};

/**
 * Check if a user should be treated as owner
 * Checks both provided roles and database for Owner role assignment
 */
const isUserOwner = async (userId, roles = null) => {
  // If roles are provided, check them first
  if (roles && roles.length > 0) {
    if (isOwner(roles)) {
      return true;
    }
  }

  // Check if user has an "Owner" role assigned in the database
  // This handles cases where owner might not have role mappings yet
  try {
    // First, find the Owner role in the Role table
    const ownerRole = await Role.findOne({
      $or: [
        { name: { $regex: /^owner$/i } },
        { name: { $regex: /^general_manager$/i } },
        { name: { $regex: /^general manager$/i } }
      ]
    }).lean();

    if (ownerRole) {
      // Check if user has this role assigned
      const userRoleMapping = await UserRoleMapping.findOne({
        user_id: userId,
        role_id: ownerRole._id
      }).lean();

      if (userRoleMapping) {
        console.log(`👑 User ${userId} has Owner role assigned in database`);
        return true;
      }
    }
  } catch (error) {
    console.warn("Could not check owner role in database:", error.message);
  }

  return false;
};

/**
 * Get all permissions for a user by traversing the RBAC chain
 * User → User_Role_Mapping → Roles → Role_Permission_Mapping → Permissions
 * 
 * SPECIAL CASE: If user has Owner role (or should be treated as owner), automatically add all GM permissions
 */
export const getUserPermissions = async (userId) => {
  try {
    // Step 1: Get all roles assigned to the user
    const userRoles = await UserRoleMapping.find({ user_id: userId })
      .populate("role_id")
      .lean();

    const roles = userRoles && userRoles.length > 0 ? userRoles.map((ur) => ur.role_id) : [];
    const roleIds = roles.map((ur) => ur._id);

    // Step 2: Check if user is owner (even if they have no roles)
    const userIsOwner = await isUserOwner(userId, roles);
    
    // Step 3: If user is owner but has no roles, return GM permissions directly
    if (userIsOwner && (!userRoles || userRoles.length === 0)) {
      console.log(`👑 Owner detected (userId: ${userId}) with no roles, returning GM permissions directly`);
      const ownerGMPermissions = await getOwnerGMPermissions();
      console.log(`✅ Returning ${ownerGMPermissions.length} GM permissions for owner`);
      return ownerGMPermissions;
    }

    // Step 4: If user has no roles and is not owner, return empty
    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    // Step 5: Get all permissions for these roles
    const rolePermissions = await RolePermissionMapping.find({
      role_id: { $in: roleIds }
    })
      .populate("permission_id")
      .lean();

    // Step 6: Extract unique permissions with meta data
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

    // Step 7: SPECIAL CASE - If user is Owner, automatically add all GM permissions
    if (userIsOwner) {
      console.log(`👑 Owner detected (userId: ${userId}), automatically adding GM permissions`);
      const ownerGMPermissions = await getOwnerGMPermissions();
      
      ownerGMPermissions.forEach(perm => {
        // Only add if not already present (don't override existing permissions)
        if (!permissionsMap.has(perm.permission_key)) {
          console.log(`✅ Adding GM permission to owner: ${perm.permission_key} (${perm.name})`);
          permissionsMap.set(perm.permission_key, perm);
        } else {
          console.log(`⏭️ Owner already has permission: ${perm.permission_key}`);
        }
      });
    }

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
