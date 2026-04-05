import React from 'react';
import { BookOpen, Code, CircuitBoard, Layers, Zap, ArrowRight } from 'lucide-react';

const DocumentationSection: React.FC = () => {
  return (
    <section id="docs" className="py-24 relative bg-white">
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-4">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-700 text-xs font-semibold uppercase tracking-wider">Documentation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Quick <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Reference</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Everything you need to know about the tech stack, training, and deployment.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tech Stack */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Layers className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">Tech Stack</h3>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { tech: 'YOLOv8n', purpose: 'Object detection model (4 classes)' },
                { tech: 'PyTorch', purpose: 'Deep learning training framework' },
                { tech: 'OpenCV', purpose: 'Image processing & camera input' },
                { tech: 'ONNX + RKNN', purpose: 'Model conversion for edge NPU' },
                { tech: 'React + TypeScript', purpose: 'Interactive web demo frontend' },
                { tech: 'Tailwind CSS', purpose: 'UI styling framework' },
                { tech: 'Canvas API', purpose: 'Real-time video/webcam rendering' },
                { tech: 'Streamlit', purpose: 'Python web app for AI inference' },
              ].map(item => (
                <div key={item.tech} className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-amber-500 mt-1 flex-shrink-0" />
                  <span><span className="text-amber-600 font-medium">{item.tech}</span> <span className="text-gray-500">- {item.purpose}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Training Guide */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Code className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">Training Guide</h3>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { step: '1', text: 'Install: pip install ultralytics opencv-python' },
                { step: '2', text: 'Prepare NEU dataset in YOLO format (images + labels)' },
                { step: '3', text: 'Train: model.train(data="data.yaml", epochs=100)' },
                { step: '4', text: 'Export: model.export(format="onnx", imgsz=640)' },
                { step: '5', text: 'Test: model.predict(source=0, show=True)' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 text-xs font-bold">{item.step}</div>
                  <span className="text-gray-500">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-gray-900 border border-gray-800">
              <pre className="text-[11px] text-amber-400 font-mono overflow-x-auto whitespace-pre">
{`from ultralytics import YOLO
model = YOLO("yolov8n.pt")
model.train(data="data.yaml", epochs=100)
model.export(format="onnx")`}
              </pre>
            </div>
          </div>

          {/* Luckfox Guide */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CircuitBoard className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">Luckfox Pico Plus</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'SoC', value: 'RV1106' },
                  { label: 'CPU', value: 'Cortex-A7 1.2GHz' },
                  { label: 'NPU', value: '0.5 TOPS INT8' },
                  { label: 'RAM', value: '256MB DDR3L' },
                ].map(s => (
                  <div key={s.label} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-gray-400 text-[10px]">{s.label}</div>
                    <div className="text-gray-900 text-xs font-medium">{s.value}</div>
                  </div>
                ))}
              </div>
              <p className="font-medium text-gray-900 text-xs">Deployment steps:</p>
              {[
                'Export: best.pt to best.onnx',
                'Convert: ONNX to RKNN (INT8 quantization)',
                'Flash Buildroot Linux to MicroSD',
                'Cross-compile C inference code',
                'Deploy via SCP + run on NPU (~20 FPS)',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 text-xs font-bold mt-0.5">{i + 1}.</span>
                  <span className="text-gray-500 text-xs">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detection Pipeline */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">How Detection Works</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <p className="text-xs mb-3">The web demo uses real pixel analysis (not fake random boxes):</p>
              {[
                'Divide image into 16x16 pixel blocks',
                'Compute per-block brightness, variance, edge score',
                'Calculate global statistics as baseline',
                'Flag blocks deviating >1.5x from normal as anomalies',
                'Cluster adjacent anomalous blocks into regions',
                'Analyze shape: aspect ratio, circularity, 2D/3D depth',
                'Classify: linear=scratch, branching=crack, compact=damage, irregular=broken',
                'Clean images with no anomalies show PASS',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-orange-500 mt-1 flex-shrink-0" />
                  <span className="text-xs">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ESP32-CAM Setup */}
        <div className="mt-6 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg">ESP32-CAM Setup</h3>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-gray-500 text-xs mb-3">Connect an ESP32-CAM module for wireless defect inspection:</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'Module', value: 'ESP32-CAM (AI-Thinker)' },
                { label: 'Camera', value: 'OV2640' },
                { label: 'Resolution', value: '640×480 (VGA)' },
                { label: 'Connection', value: 'WiFi MJPEG' },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-gray-400 text-[10px]">{s.label}</div>
                  <div className="text-gray-900 text-xs font-medium">{s.value}</div>
                </div>
              ))}
            </div>
            <p className="font-medium text-gray-900 text-xs">Quick start:</p>
            {[
              'Install ESP32 board support in Arduino IDE',
              'Open esp32_cam_firmware.ino, set your WiFi SSID & password',
              'Select "AI Thinker ESP32-CAM" board, upload the sketch',
              'Open Serial Monitor (115200 baud) to get the IP address',
              'In the web app, click ESP32-CAM tab → enter IP → Connect',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-500 text-xs font-bold mt-0.5">{i + 1}.</span>
                <span className="text-gray-500 text-xs">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="mt-8 p-6 rounded-2xl bg-gray-50 border border-gray-100">
          <h3 className="text-gray-900 font-bold text-sm mb-3">Useful Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Luckfox Wiki', url: 'wiki.luckfox.com' },
              { label: 'RKNN Toolkit2', url: 'github.com/rockchip-linux/rknn-toolkit2' },
              { label: 'Ultralytics YOLOv8', url: 'docs.ultralytics.com' },
              { label: 'NEU Dataset', url: 'faculty.neu.edu.cn/songkechen' },
              { label: 'Luckfox SDK', url: 'github.com/LuckfoxTECH/luckfox-pico' },
              { label: 'OpenCV', url: 'opencv.org' },
              { label: 'ESP32-CAM Docs', url: 'docs.espressif.com' },
            ].map(link => (
              <div key={link.label} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200">
                <ArrowRight className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <span className="text-gray-900 font-medium">{link.label}:</span>
                <span className="text-amber-600 truncate">{link.url}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentationSection;
