const fs = require('fs');
const path = require('path');

const viPath = path.join(__dirname, '../apps/control-plane/messages/vi.json');
const enPath = path.join(__dirname, '../apps/control-plane/messages/en.json');
const vi = JSON.parse(fs.readFileSync(viPath));
const en = JSON.parse(fs.readFileSync(enPath));

en.Routing = {
  globalStrategy: 'Global Routing Strategy',
  balancedStrategy: 'Balanced Strategy',
  balancedDesc: 'Weights health, latency, and cost variables evenly.',
  costStrategy: 'Cost Optimized Strategy',
  costDesc: 'Prioritizes free/low-cost adapters (Ollama local).',
  latencyStrategy: 'Latency Optimized Strategy',
  latencyDesc: 'Routes to fastest response times (OpenAI Cloud).',
  haStrategy: 'High Availability Strategy',
  haDesc: 'Aggressively avoids failing endpoints using circuit breakers.',
  pipelineFlow: 'Request Routing Pipeline Flow',
  nodeInspector: 'Node Inspector',
  stageName: 'Stage Name',
  executionDetails: 'Execution Details',
  telemetryContext: 'Telemetry Context',
  clickToInspect: 'Click on any pipeline node to inspect execution logic details.',
  statusSuccess: 'Success',
  statusClosed: 'Closed',
  scanLabel: 'Prompt Scanner',
  scanDetails: 'Scanning input for script tags and injection patterns.',
  piiLabel: 'PII Detector',
  piiDetails: 'Vietnamese regex CCCD/phone checker executed. 0 leaks blocked.',
  policyLabel: 'Routing Policy Engine',
  policyDetails: 'Active rules matched. Evaluating strategies against: {strategy}.',
  scoreLabel: 'Provider Score Engine',
  scoreDetails: 'Scores calculated: Ollama (92), OpenAI (85), Bedrock (72).',
  routerLabel: 'Dynamic Router Decision',
  routerDetailsOpenai: 'Selected OpenAI gpt-4o based on {strategy} strategy.',
  routerDetailsOllama: 'Selected Ollama local model based on {strategy} strategy.',
  routerDetailsClaude: 'Selected Bedrock anthropic.claude-3-sonnet based on {strategy} strategy.',
  circuitLabel: 'Circuit Breaker Check',
  circuitDetails: 'All circuits verified CLOSED. Proceeding to adapter dispatch.'
};

vi.Routing = {
  globalStrategy: 'Chiến Lược Điều Hướng Toàn Cầu',
  balancedStrategy: 'Chiến Lược Cân Bằng',
  balancedDesc: 'Cân bằng các biến thể về sức khỏe, độ trễ và chi phí.',
  costStrategy: 'Chiến Lược Tối Ưu Chi Phí',
  costDesc: 'Ưu tiên các bộ chuyển đổi miễn phí/giá rẻ (Ollama local).',
  latencyStrategy: 'Chiến Lược Tối Ưu Độ Trễ',
  latencyDesc: 'Điều hướng đến thời gian phản hồi nhanh nhất (OpenAI Cloud).',
  haStrategy: 'Chiến Lược Tính Sẵn Sàng Cao',
  haDesc: 'Tích cực tránh các endpoint bị lỗi bằng cách sử dụng bộ ngắt mạch.',
  pipelineFlow: 'Luồng Điều Hướng Yêu Cầu',
  nodeInspector: 'Bộ Kiểm Tra Node',
  stageName: 'Tên Giai Đoạn',
  executionDetails: 'Chi Tiết Thực Thi',
  telemetryContext: 'Ngữ Cảnh Từ Xa',
  clickToInspect: 'Nhấp vào bất kỳ node nào trên luồng để kiểm tra chi tiết logic thực thi.',
  statusSuccess: 'Thành Công',
  statusClosed: 'Đã Đóng',
  scanLabel: 'Quét Prompt',
  scanDetails: 'Quét đầu vào cho các thẻ kịch bản và mẫu injection.',
  piiLabel: 'Phát Hiện PII',
  piiDetails: 'Đã chạy Regex CCCD/số điện thoại VN. Chặn 0 rò rỉ.',
  policyLabel: 'Công Cụ Chính Sách Điều Hướng',
  policyDetails: 'Quy tắc hoạt động khớp. Đánh giá chiến lược theo: {strategy}.',
  scoreLabel: 'Công Cụ Điểm Nhà Cung Cấp',
  scoreDetails: 'Điểm tính toán: Ollama (92), OpenAI (85), Bedrock (72).',
  routerLabel: 'Quyết Định Điều Hướng Động',
  routerDetailsOpenai: 'Đã chọn OpenAI gpt-4o dựa trên chiến lược {strategy}.',
  routerDetailsOllama: 'Đã chọn Ollama mô hình nội bộ dựa trên chiến lược {strategy}.',
  routerDetailsClaude: 'Đã chọn Bedrock anthropic.claude-3-sonnet dựa trên chiến lược {strategy}.',
  circuitLabel: 'Kiểm Tra Bộ Ngắt Mạch',
  circuitDetails: 'Tất cả các mạch đã xác nhận ĐÓNG. Tiếp tục chuyển đến bộ điều hợp.'
};

fs.writeFileSync(viPath, JSON.stringify(vi, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

const pagePath = path.join(__dirname, '../apps/control-plane/src/app/[locale]/admin/routing/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

content = content.replace("const t = useTranslations('Admin');", "const t = useTranslations('Admin');\n  const tRouting = useTranslations('Routing');");

// Strings replacement in routing
content = content.replace(/'Prompt Scanner'/g, "tRouting('scanLabel')");
content = content.replace(/'Scanning input for script tags and injection patterns\.'/g, "tRouting('scanDetails')");
content = content.replace(/'PII Detector'/g, "tRouting('piiLabel')");
content = content.replace(/'Vietnamese regex CCCD\/phone checker executed\. 0 leaks blocked\.'/g, "tRouting('piiDetails')");
content = content.replace(/'Routing Policy Engine'/g, "tRouting('policyLabel')");
content = content.replace(/`Active rules matched\. Evaluating strategies against: \$\{currentStrategy\}\.`/g, "tRouting('policyDetails', { strategy: currentStrategy })");
content = content.replace(/'Provider Score Engine'/g, "tRouting('scoreLabel')");
content = content.replace(/'Scores calculated: Ollama \(92\), OpenAI \(85\), Bedrock \(72\)\.'/g, "tRouting('scoreDetails')");
content = content.replace(/'Dynamic Router Decision'/g, "tRouting('routerLabel')");
content = content.replace(/'Circuit Breaker Check'/g, "tRouting('circuitLabel')");
content = content.replace(/'All circuits verified CLOSED\. Proceeding to adapter dispatch\.'/g, "tRouting('circuitDetails')");
content = content.replace(/'Success'/g, "tRouting('statusSuccess')");
content = content.replace(/'Closed'/g, "tRouting('statusClosed')");
content = content.replace(/'Balanced Strategy'/g, "tRouting('balancedStrategy')");
content = content.replace(/'Weights health, latency, and cost variables evenly\.'/g, "tRouting('balancedDesc')");
content = content.replace(/'Cost Optimized Strategy'/g, "tRouting('costStrategy')");
content = content.replace(/'Prioritizes free\/low-cost adapters \(Ollama local\)\.'/g, "tRouting('costDesc')");
content = content.replace(/'Latency Optimized Strategy'/g, "tRouting('latencyStrategy')");
content = content.replace(/'Routes to fastest response times \(OpenAI Cloud\)\.'/g, "tRouting('latencyDesc')");
content = content.replace(/'High Availability Strategy'/g, "tRouting('haStrategy')");
content = content.replace(/'Aggressively avoids failing endpoints using circuit breakers\.'/g, "tRouting('haDesc')");

content = content.replace(/>Global Routing Strategy</g, ">{tRouting('globalStrategy')}<");
content = content.replace(/>Request Routing Pipeline Flow</g, ">{tRouting('pipelineFlow')}<");
content = content.replace(/>Node Inspector</g, ">{tRouting('nodeInspector')}<");
content = content.replace(/>Stage Name</g, ">{tRouting('stageName')}<");
content = content.replace(/>Execution Details</g, ">{tRouting('executionDetails')}<");
content = content.replace(/>Telemetry Context</g, ">{tRouting('telemetryContext')}<");
content = content.replace(/>Click on any pipeline node to inspect execution logic details\.</g, ">{tRouting('clickToInspect')}<");

// router dynamic details
content = content.replace(/`Selected \$\{([^`]+)`/, "`\\${tRouting(currentStrategy === 'latency-optimized' ? 'routerDetailsOpenai' : currentStrategy === 'cost-optimized' ? 'routerDetailsOllama' : currentStrategy === 'high-availability' ? 'routerDetailsClaude' : 'routerDetailsOpenai', { strategy: currentStrategy.replace('-', ' ') })}`");

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Routing stats translated');
