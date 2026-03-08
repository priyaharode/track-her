"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const predictions_1 = require("./routes/predictions");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running! ✅' });
});
// Routes
app.use('/api', predictions_1.predictionsRouter);
// Start server
function startServer() {
    app.listen(PORT, () => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🌸 trackHER Backend Server`);
        console.log(`${'='.repeat(60)}`);
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`📍 Health check: http://localhost:${PORT}/health`);
        console.log(`📍 API: http://localhost:${PORT}/api/predict`);
        console.log(`${'='.repeat(60)}\n`);
    });
}
//# sourceMappingURL=server.js.map