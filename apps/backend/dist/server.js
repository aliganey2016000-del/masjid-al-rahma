"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before anything else touches process.env.
//
// backend/.env.production holds real VPS values (a Docker-internal Mongo
// URI, the VPS's public IP as CLIENT_URL, etc.) — loading it on a local
// dev machine breaks the DB connection and CORS. So: prefer a local-only
// backend/.env (gitignored, create it yourself with just the values you
// need to override locally, e.g. DEEPSEEK_API_KEY) and only fall back to
// .env.production if no local .env exists — e.g. when actually running
// on the VPS.
const localEnvPath = path_1.default.resolve(__dirname, '../.env');
const prodEnvPath = path_1.default.resolve(__dirname, '../.env.production');
dotenv_1.default.config({ path: fs_1.default.existsSync(localEnvPath) ? localEnvPath : prodEnvPath });
const mongoose_1 = __importDefault(require("mongoose"));
// Register all models before routes are loaded
require("./models/announcement.model");
require("./models/news.model");
require("./models/event.model");
require("./models/gallery.model");
require("./models/payment.model");
require("./models/certificate.model");
require("./models/exam.model");
require("./models/result.model");
require("./models/parent.model");
require("./models/setting.model");
require("./models/activity-log.model");
require("./models/assignment.model");
require("./models/school.model");
require("./models/resource.model");
require("./models/notification.model");
require("./models/course-content.model");
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rayan2016003_db_user:635110Liiali@rahma.bo0elay.mongodb.net/masjid-al-rahma?appName=rahma&retryWrites=true&w=majority';
// ---------------------------------------------------------------------------
// Database Connection & Server Start
// ---------------------------------------------------------------------------
async function startServer() {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        // Start Express server
        app_1.default.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api/v1`);
            console.log(`💚 Health check: http://localhost:${PORT}/api/v1/health`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map