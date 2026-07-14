"use strict";
/**
 * School Controller
 *
 * Handles school-related HTTP requests:
 * CRUD operations for school management.
 * Only admins can manage schools.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.updateStatus = exports.update = exports.create = exports.getById = exports.getAll = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const school_model_1 = __importDefault(require("../models/school.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const profile_model_1 = __importDefault(require("../models/profile.model"));
const api_response_1 = __importDefault(require("../utils/api-response"));
const api_error_1 = require("../utils/api-error");
// ---------------------------------------------------------------------------
// GET /schools — List all with pagination, search, and filters
//
// org_admin is scoped to ONLY their own organization — a school doesn't
// have an "organizationId" field pointing elsewhere, it IS the tenant, so
// the scope is applied directly against `_id` rather than via tenant-scope.ts.
// ---------------------------------------------------------------------------
const getAll = async (req, res) => {
    const { status, page = '1', limit = '20', search, } = req.query;
    const filter = {};
    if (status && ['active', 'inactive'].includes(status)) {
        filter.status = status;
    }
    if (req.user?.role === 'org_admin') {
        filter._id = req.user.organizationId || null; // null → matches nothing if somehow unset
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const [schools, total] = await Promise.all([
        school_model_1.default.find(filter)
            .populate('createdBy', 'email')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean(),
        school_model_1.default.countDocuments(filter),
    ]);
    let result = schools;
    if (search) {
        const s = search.toLowerCase();
        result = schools.filter((item) => {
            const name = (item.name || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const principal = (item.principalName || '').toLowerCase();
            const address = (item.address || '').toLowerCase();
            return name.includes(s) || email.includes(s) || principal.includes(s) || address.includes(s);
        });
    }
    return api_response_1.default.paginated(res, result, {
        page: pageNum,
        limit: limitNum,
        total: search ? result.length : total,
    });
};
exports.getAll = getAll;
// ---------------------------------------------------------------------------
// GET /schools/:id — Get single school
// ---------------------------------------------------------------------------
const getById = async (req, res) => {
    if (req.user?.role === 'org_admin' && req.params.id !== req.user.organizationId) {
        throw new api_error_1.ForbiddenError("You do not have permission to view another organization's details.");
    }
    const school = await school_model_1.default.findById(req.params.id)
        .populate('createdBy', 'email')
        .lean();
    if (!school) {
        throw new api_error_1.NotFoundError('School not found');
    }
    return api_response_1.default.success(res, school);
};
exports.getById = getById;
// ---------------------------------------------------------------------------
// POST /schools — Create a new school
// ---------------------------------------------------------------------------
const create = async (req, res) => {
    const payload = {
        ...req.body,
        createdBy: new mongoose_1.default.Types.ObjectId(req.user.userId),
    };
    const school = await school_model_1.default.create(payload);
    // ── Auto-assign Org_Admin user for this school's principal email ──
    // Isolated in its own try/catch: the school itself is already created at
    // this point, so a failure here must never turn into a 500 that leaves the
    // admin thinking the whole registration failed while the org actually
    // exists without a login. We log it clearly and surface a warning instead.
    const schoolEmail = req.body.email;
    let orgAdminWarning = null;
    if (schoolEmail) {
        try {
            const existingUser = await user_model_1.default.findOne({ email: schoolEmail.toLowerCase() });
            if (existingUser) {
                // Update existing user's role and organizationId
                existingUser.role = 'org_admin';
                existingUser.organizationId = school._id;
                existingUser.isActive = true;
                existingUser.isVerified = true;
                await existingUser.save({ validateBeforeSave: false });
            }
            else {
                // Create new org_admin user — password is the raw phone number;
                // the User model's pre-save hook bcrypt-hashes it exactly once.
                // Do NOT hash it here too, or comparePassword() will never match.
                const orgAdmin = await user_model_1.default.create({
                    email: schoolEmail.toLowerCase(),
                    password: req.body.phone || 'ChangeMe@123',
                    role: 'org_admin',
                    organizationId: school._id,
                    isVerified: true,
                    isActive: true,
                    preferredLanguage: 'en',
                });
                await profile_model_1.default.create({
                    user: orgAdmin._id,
                    firstName: req.body.principalName || 'Principal',
                    lastName: '',
                    gender: 'male',
                });
            }
        }
        catch (err) {
            console.error(`[school.create] Failed to sync org_admin user for "${schoolEmail}":`, err);
            orgAdminWarning = `Organization was created, but the admin login account could not be provisioned automatically (${err.message}). Please check for an existing account with this email or contact support.`;
        }
    }
    const populated = await school_model_1.default.findById(school._id)
        .populate('createdBy', 'email')
        .lean();
    return api_response_1.default.created(res, populated, orgAdminWarning || 'School registered successfully');
};
exports.create = create;
// ---------------------------------------------------------------------------
// PATCH /schools/:id — Update a school
// ---------------------------------------------------------------------------
const update = async (req, res) => {
    const updates = { ...req.body };
    if (req.user?.role === 'org_admin') {
        if (req.params.id !== req.user.organizationId) {
            throw new api_error_1.ForbiddenError("You do not have permission to update another organization.");
        }
        // Activation/suspension is super-admin only, via PATCH /:id/status —
        // strip it here so an org_admin can't reactivate/suspend themselves
        // through the general-purpose update endpoint.
        delete updates.status;
        delete updates.createdBy;
    }
    const school = await school_model_1.default.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
        .populate('createdBy', 'email')
        .lean();
    if (!school) {
        throw new api_error_1.NotFoundError('School not found');
    }
    return api_response_1.default.success(res, school, 'School updated successfully');
};
exports.update = update;
// ---------------------------------------------------------------------------
// PATCH /schools/:id/status — Toggle school status
// ---------------------------------------------------------------------------
const updateStatus = async (req, res) => {
    const { status } = req.body;
    if (!status || !['active', 'inactive'].includes(status)) {
        throw new api_error_1.BadRequestError('Status must be "active" or "inactive"');
    }
    const school = await school_model_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true })
        .populate('createdBy', 'email')
        .lean();
    if (!school) {
        throw new api_error_1.NotFoundError('School not found');
    }
    return api_response_1.default.success(res, school, `School ${status === 'active' ? 'activated' : 'deactivated'}`);
};
exports.updateStatus = updateStatus;
// ---------------------------------------------------------------------------
// DELETE /schools/:id — Remove a school
// ---------------------------------------------------------------------------
const remove = async (req, res) => {
    const school = await school_model_1.default.findByIdAndDelete(req.params.id);
    if (!school) {
        throw new api_error_1.NotFoundError('School not found');
    }
    return api_response_1.default.success(res, null, 'School deleted successfully');
};
exports.remove = remove;
//# sourceMappingURL=school.controller.js.map