import React from 'react';
import { AlertTriangle, Target, Lightbulb, Factory, CircuitBoard, Cog } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 relative bg-white">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-4">
            <span className="text-amber-700 text-xs font-semibold uppercase tracking-wider">Project Overview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            About the <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Project</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            An AI-powered visual inspection system making precision quality control accessible to manufacturers worldwide.
          </p>
        </div>

        {/* Problem → Solution → Impact */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-500">
            <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mb-6">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">The Problem</h3>
            <p className="text-gray-500 leading-relaxed">
              Manual visual inspection of surface defects in manufacturing is <span className="text-red-500 font-medium">tedious, inconsistent, and error-prone</span>. 
              SMEs lack affordable automated quality control solutions, leading to defective products reaching customers, increased waste, and higher costs.
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all duration-500">
            <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center mb-6">
              <Target className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Solution</h3>
            <p className="text-gray-500 leading-relaxed">
              An <span className="text-amber-600 font-medium">accessible, AI-powered</span> visual inspection system using YOLOv8 deep learning that detects, classifies, and localizes 4 types of surface defects — cracks, damage, broken, and scratches — through real-time image, video, and webcam analysis.
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-green-200 transition-all duration-500">
            <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center mb-6">
              <Lightbulb className="w-7 h-7 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">The Impact</h3>
            <p className="text-gray-500 leading-relaxed">
              Delivers <span className="text-green-600 font-medium">high-confidence defect detection</span> with bounding box overlays, clear verdicts, and confidence scores — enabling SMEs to achieve precision inspection without expensive hardware investment.
            </p>
          </div>
        </div>

        {/* Applications */}
        <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Industry Applications</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Cog, name: 'Metal Fabrication', desc: 'Surface crack & scratch detection' },
              { icon: Factory, name: 'Automotive', desc: 'Body panel & part inspection' },
              { icon: CircuitBoard, name: 'Electronics', desc: 'PCB & component analysis' },
              { icon: Factory, name: 'Textile', desc: 'Fabric tear & defect scanning' },
            ].map((app) => (
              <div key={app.name} className="text-center p-4 rounded-xl hover:bg-white hover:shadow-sm transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center mx-auto mb-3">
                  <app.icon className="w-6 h-6 text-amber-500" />
                </div>
                <h4 className="text-gray-900 font-semibold mb-1">{app.name}</h4>
                <p className="text-gray-400 text-sm">{app.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
