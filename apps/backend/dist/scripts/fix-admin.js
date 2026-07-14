"use strict";
/**
 * Fix Admin Script
 *
 * Resets the admin user password and unlocks the account.
 * Run: npx ts-node src/scripts/fix-admin.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../models/user.model"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rayan2016003_db_user:635110Liiali@rahma.bo0elay.mongodb.net/masjid-al-rahma?appName=rahma&retryWrites=true&w=majority';
const ADMIN_EMAIL = 'admin@masjidalrahma.com';
const NEW_PASSWORD = 'Admin@2025#Secure';
async function fixAdmin() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        const user = await user_model_1.default.findOne({ email: ADMIN_EMAIL }).select('+password +failedLoginAttempts +lockedUntil');
        if (!user) {
            console.log('❌ Admin user not found! Creating new admin...');
            const Profile = (await Promise.resolve().then(() => __importStar(require('../models/profile.model')))).default;
            const newUser = await user_model_1.default.create({
                email: ADMIN_EMAIL,
                password: NEW_PASSWORD,
                role: 'admin',
                isVerified: true,
                isActive: true,
                preferredLanguage: 'en',
            });
            await Profile.create({
                user: newUser._id,
                firstName: 'Admin',
                lastName: 'User',
                gender: 'male',
            });
            console.log('✅ Admin user created successfully');
        }
        else {
            // Update password and unlock account
            user.password = NEW_PASSWORD;
            user.failedLoginAttempts = 0;
            user.lockedUntil = undefined;
            user.isVerified = true;
            user.isActive = true;
            await user.save();
            console.log('✅ Admin user updated successfully');
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:    admin@masjidalrahma.com');
        console.log('🔑 Password: Admin@2025#Secure');
        console.log('👤 Role:     admin');
        console.log('🔓 Status:   Unlocked & Active');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}
fixAdmin();
//# sourceMappingURL=fix-admin.js.map