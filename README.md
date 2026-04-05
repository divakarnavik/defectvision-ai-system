# DefectVision AI System

DefectVision AI System is a web-based application that detects product damage, defects, and scratches from images using **YOLOv8 deep learning**. Users can upload an image or capture one using a webcam, and the system analyzes the image to identify visible defects.

## Live Demo
https://defectvision-ai-system.vercel.app/

## Features
- Upload product images for defect analysis
- Capture live images using webcam
- Detect scratches, damage, and visible defects
- AI-powered analysis using YOLOv8
- User-friendly React frontend
- Fast and responsive interface

## Tech Stack
### Frontend
- React
- TypeScript
- Vite
- CSS

### AI / Detection
- YOLOv8
- Deep Learning based object detection

## How It Works
1. User uploads an image or captures it with webcam
2. The image is passed to the detection system
3. YOLOv8 analyzes the image
4. Detected defects/damages are highlighted and shown to the user

## Project Structure
```bash
src/
 ├── components/
 ├── context/
 ├── data/
 ├── utils/
 ├── App.tsx
 ├── main.tsx
 └── index.css
```

## Installation
Clone the repository:

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Usage
- Open the website
- Upload an image or use webcam capture
- Wait for the AI model to process the image
- View the detected defects and damage results

## Future Improvements
- ESP32-CAM integration
- Real-time live inspection
- Defect severity analysis
- Report generation
- Backend API integration for deployed inference

## Author
**Divakar Navik**

## License
This project is for educational and project demonstration purposes.
