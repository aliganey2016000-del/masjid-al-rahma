"use strict";
/**
 * Fix Organization Admin User
 *
 * Ensures the org_admin user exists with proper role, organization binding,
 * and password. Run: npx ts-node src/scripts/fix-org-admin.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../models/user.model"));
const profile_model_1 = __importDefault(require("../models/profile.model"));
const school_model_1 = __importDefault(require("../models/school.model"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rayan2016003_db_user:635110Liiali@rahma.bo0elay.mongodb.net/masjid-al-rahma?appName=rahma&retryWrites=true&w=majority';
const ORG_ADMIN = {
    email: 'diriye@gmail.com',
    password: '615328006',
    firstName: 'Diriye',
    lastName: 'Admin',
};
async function fixOrgAdmin() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        // Find a school to assign if none exists
        const schools = await school_model_1.default.find({}).sort({ createdAt: -1 }).limit(1).lean();
        const schoolId = schools[0]?._id;
        // Find or create the user
        let user = await user_model_1.default.findOne({ email: ORG_ADMIN.email }).select('+password +failedLoginAttempts +lockedUntil');
        if (user) {
            console.log('⚠️ User exists, updating...');
            user.role = 'org_admin';
            user.password = ORG_ADMIN.password; // will be hashed by pre-save hook
            user.organizationId = schoolId || undefined;
            user.isVerified = true;
            user.isActive = true;
            user.failedLoginAttempts = 0;
            user.lockedUntil = undefined;
            await user.save();
            console.log('✅ User updated');
        }
        else {
            console.log('⚠️ User not found, creating...');
            user = await user_model_1.default.create({
                email: ORG_ADMIN.email.toLowerCase(),
                password: ORG_ADMIN.password,
                role: 'org_admin',
                organizationId: schoolId || undefined,
                isVerified: true,
                isActive: true,
                preferredLanguage: 'en',
            });
            await profile_model_1.default.create({
                user: user._id,
                firstName: ORG_ADMIN.firstName,
                lastName: ORG_ADMIN.lastName,
                gender: 'male',
            });
            console.log('✅ User created with profile');
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:    diriye@gmail.com');
        console.log('🔑 Password: 615328006');
        console.log('👤 Role:     org_admin');
        console.log('🏢 Org ID:  ', user.organizationId || '(none)');
        console.log('🔓 Status:   Active & Unlocked');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Login at: http://localhost:5173/auth/login');
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}
fixOrgAdmin();
//# sourceMappingURL=fix-org-admin.js.map