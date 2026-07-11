const fs = require('fs');
const path = require('path');

const viPath = path.join(__dirname, '../apps/control-plane/messages/vi.json');
const enPath = path.join(__dirname, '../apps/control-plane/messages/en.json');
const vi = JSON.parse(fs.readFileSync(viPath));
const en = JSON.parse(fs.readFileSync(enPath));

en.Dashboard = {
  totalRequests: 'Total Requests',
  averageLatency: 'Average Latency',
  cacheHitRatio: 'Cache Hit Ratio',
  todayCostUsd: 'Today Cost (USD)',
  piiShieldBlocks: 'PII Shield Blocks',
  securityViolations: 'Security Violations',
  circuitBreakerEvents: 'Circuit Breaker Events',
  activeUsers: 'Active Users',
  failedToLoad: 'Failed to load statistics',
  pleaseEnsure: 'Please ensure the gateway server is running on port 3000.',
  retryConnection: 'Retry Connection',
  refresh: 'Refresh',
  gatewayCostPipeline: 'Gateway Cost Pipeline (USD)',
  liveAreaChart: 'Live Area Chart',
  recentGatewayOperations: 'Recent Gateway Operations',
  user: 'User',
  promptPreview: 'Prompt Preview',
  provider: 'Provider',
  latency: 'Latency',
  cost: 'Cost',
  status: 'Status',
  noRecentLogs: 'No recent request logs recorded.'
};

vi.Dashboard = {
  totalRequests: 'Tổng Số Yêu Cầu',
  averageLatency: 'Độ Trễ Trung Bình',
  cacheHitRatio: 'Tỷ Lệ Trúng Bộ Nhớ Đệm',
  todayCostUsd: 'Chi Phí Hôm Nay (USD)',
  piiShieldBlocks: 'Chặn PII Bằng Lá Chắn',
  securityViolations: 'Vi Phạm Bảo Mật',
  circuitBreakerEvents: 'Sự Kiện Ngắt Mạch',
  activeUsers: 'Người Dùng Hoạt Động',
  failedToLoad: 'Không thể tải thống kê',
  pleaseEnsure: 'Vui lòng đảm bảo máy chủ gateway đang chạy trên cổng 3000.',
  retryConnection: 'Thử kết nối lại',
  refresh: 'Làm mới',
  gatewayCostPipeline: 'Biểu đồ Chi phí (USD)',
  liveAreaChart: 'Biểu đồ vùng trực tiếp',
  recentGatewayOperations: 'Hoạt động gần đây của Gateway',
  user: 'Người dùng',
  promptPreview: 'Xem trước Prompt',
  provider: 'Nhà cung cấp',
  latency: 'Độ trễ',
  cost: 'Chi phí',
  status: 'Trạng thái',
  noRecentLogs: 'Không có nhật ký yêu cầu gần đây.'
};

fs.writeFileSync(viPath, JSON.stringify(vi, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

const dashboardPath = path.join(__dirname, '../apps/control-plane/src/app/[locale]/admin/dashboard/page.tsx');
let content = fs.readFileSync(dashboardPath, 'utf8');

content = content.replace("const t = useTranslations('Admin');", "const t = useTranslations('Admin');\n  const tDashboard = useTranslations('Dashboard');");

// Replace stat cards
content = content.replace(/'Total Requests'/g, "tDashboard('totalRequests')");
content = content.replace(/'Average Latency'/g, "tDashboard('averageLatency')");
content = content.replace(/'Cache Hit Ratio'/g, "tDashboard('cacheHitRatio')");
content = content.replace(/'Today Cost \(USD\)'/g, "tDashboard('todayCostUsd')");
content = content.replace(/'PII Shield Blocks'/g, "tDashboard('piiShieldBlocks')");
content = content.replace(/'Security Violations'/g, "tDashboard('securityViolations')");
content = content.replace(/'Circuit Breaker Events'/g, "tDashboard('circuitBreakerEvents')");
content = content.replace(/'Active Users'/g, "tDashboard('activeUsers')");

// Replace other strings
content = content.replace(/>Failed to load statistics</g, ">{tDashboard('failedToLoad')}<");
content = content.replace(/>Please ensure the gateway server is running on port 3000\.</g, ">{tDashboard('pleaseEnsure')}<");
content = content.replace(/>Retry Connection</g, ">{tDashboard('retryConnection')}<");
content = content.replace(/>Refresh</g, ">{tDashboard('refresh')}<");
content = content.replace(/>Gateway Cost Pipeline \(USD\)</g, ">{tDashboard('gatewayCostPipeline')}<");
content = content.replace(/>Live Area Chart</g, ">{tDashboard('liveAreaChart')}<");
content = content.replace(/>Recent Gateway Operations</g, ">{tDashboard('recentGatewayOperations')}<");
content = content.replace(/>User</g, ">{tDashboard('user')}<");
content = content.replace(/>Prompt Preview</g, ">{tDashboard('promptPreview')}<");
content = content.replace(/>Provider</g, ">{tDashboard('provider')}<");
content = content.replace(/>Latency</g, ">{tDashboard('latency')}<");
content = content.replace(/>Cost</g, ">{tDashboard('cost')}<");
content = content.replace(/>Status</g, ">{tDashboard('status')}<");
content = content.replace(/>No recent request logs recorded\.</g, ">{tDashboard('noRecentLogs')}<");

fs.writeFileSync(dashboardPath, content, 'utf8');
console.log('Dashboard stats translated');
