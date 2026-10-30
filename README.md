# PharmaScreen AI – Drug Discovery Lab

An educational in-silico drug candidate screening and prediction platform that analyzes chemical compounds using SMILES notation, computes and retrieves molecular properties via PubChem PUG REST, evaluates drug-likeness using Lipinski's Rule of Five and Veber criteria, performs verified Machine Learning classification in pure JavaScript, and generates AI-assisted medicinal chemistry explanations through Google Gemini.

---

> ### ⚠️ Mandatory Educational Research Prototype Disclaimer
> **PharmaScreen AI** is strictly an educational research prototype and cheminformatics demonstrator. All computed descriptors, Lipinski evaluations, machine learning predictions, and AI-assisted explanations are in-silico approximations intended for educational and research prototyping. They **do NOT** constitute clinical advice, biological proof of efficacy, or assurance of pharmacological safety. Never use this platform for clinical or medical decision-making.

---

## 🌟 Key Capabilities

### 1. 📊 Executive Research Dashboard
- Real-time aggregated metrics across analyzed compounds (Total Screened, Promising Candidates, Needs Review, Unfavorable).
- Real-time Average Molecular Weight and Average LogP calculations.
- Pure HTML5 Canvas charts:
  - **Donut Chart:** Lipinski classification distribution (Promising vs. Needs Review vs. Unfavorable).
  - **Bar Chart:** Molecular weight distribution bins (`<200 Da`, `200-350 Da`, `350-500 Da`, `>500 Da`).
- 1-click Quick Launchpad for classic benchmark molecules.
- Live screening history feed.

### 2. 🔬 Drug Candidate Screening
- Accepts arbitrary **SMILES** (Simplified Molecular-Input Line-Entry System) strings with real-time syntax verification (balanced parentheses, brackets, ring closure validation).
- Dedicated 1-click presets for sample benchmark compounds:
  - **Aspirin** (`CC(=O)Oc1ccccc1C(=O)O`)
  - **Paracetamol** (`CC(=O)Nc1ccc(O)cc1`)
  - **Ibuprofen** (`CC(C)Cc1ccc(cc1)C(C)C(=O)O`)
  - **Metformin** (`CN(C)C(=N)NC(=N)N`)
  - **Caffeine** (`Cn1cnc2c1c(=O)n(c(=O)n2C)C`)
  - **Imatinib** (`Cc1ccc(cc1Nc2nccc(n2)c3cccnc3)NC(=O)c4ccc(cc4)CN5CCN(CC5)C`)
  - **Atorvastatin** (`CC(C)c1c(c(c(n1CCC(CC(CC(=O)O)O)O)c2ccc(cc2)F)c3ccccc3)C(=O)Nc4ccccc4`)
- Live **PubChem PUG REST API** data retrieval (Molecular Weight, LogP, H-Bond Donors, H-Bond Acceptors, TPSA, Rotatable Bonds, 2D PNG depiction).
- **In-Silico Fallback Engine:** Automatic on-the-fly topological calculations and 2D SVG molecular rendering when offline or analyzing novel synthetic compounds.
- **Lipinski's Rule of Five Evaluation:**
  - Molecular Weight $\le 500\text{ Da}$
  - Partition Coefficient $\text{LogP} \le 5.0$
  - Hydrogen Bond Donors $\le 5$
  - Hydrogen Bond Acceptors $\le 10$
- **Veber Oral Bioavailability Rules:**
  - Rotatable Bonds $\le 10$
  - Topological Polar Surface Area (TPSA) $\le 140\text{ \AA}^2$
- **Interactive Sweet-Spot Radar Chart:** Visualizes candidate descriptors against normalized Lipinski boundaries.

### 3. 🤖 Machine Learning Classification Workflow
- Implemented in **pure JavaScript** without external Python or heavyweight dependencies.
- **Genuine Evaluation Metrics:** Accuracy, Precision, Recall, and F1-score computed **strictly on unseen, held-out test data** from a curated benchmark dataset.
- **Genuine 2x2 Confusion Matrix:** True Negatives, False Positives, False Negatives, True Positives.
- **Feature Importance:** Derived from standardized logistic regression weights showing relative impact and direction (Favorable vs. Liability/Penalizing).
- **Interactive Predictor:** Run inference on custom properties to compute exact drug-likeness probability $P(\text{Drug-like})$ and confidence score.
- **Live Retraining Engine:** Adjust test split ratio, learning rate, and epochs to re-train the model live.

### 4. 📚 Compound Dataset Explorer
- Searchable and filterable reference library of 25+ benchmark pharmaceutical agents.
- Filter by Classification (Promising, Needs Review, Unfavorable) and violation counts.
- 1-click **"Screen Molecule"** action to load any catalog compound directly into the active screener.
- Full **CSV Dataset Export**.

### 5. 📜 Screening History
- Persistent screening archive with timestamps, full descriptor records, and classification outcomes.
- Single-click re-inspection of previous candidates.
- Record deletion and history clearing.
- **CSV History Export**.

### 6. 🧠 AI-Assisted Pharmacological Explanation
- Secure backend integration with **Google Gemini API** (`gemini-2.5-flash` / `gemini-1.5-flash`).
- Structured 4-tier medicinal chemistry report:
  1. Chemical Profile & Structural Overview
  2. Drug-Likeness & Lipinski Compliance
  3. Pharmacokinetic (ADMET) Considerations
  4. Medicinal Chemistry Lead Optimization Strategy
- **Built-in Heuristic Fallback Engine:** Generates scientifically rigorous reports even when the Gemini API key is unset or offline.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3 (Modern Glassmorphism, Responsive CSS Grid & Flexbox, Dark Navy Theme with Cyan Glowing Accents), Vanilla JavaScript (ES6+), HTML5 Canvas (Rotating 3D DNA Double-Helix, Donut/Bar/Radar charts).
- **Backend:** Node.js, Express.js.
- **Data & Storage:** JSON persistent file storage, CSV export streaming.
- **Cheminformatics & Data Sources:** PubChem PUG REST API, Built-in In-Silico Topological Calculator.
- **Artificial Intelligence:** Google Gemini API (securely accessed through backend only).

---

## 📁 Project Architecture

```
pharmascreen-ai/
├── assets/
│   └── logo.svg                     # Vector brand logo
├── backend/
│   ├── routes/
│   │   ├── aiRoutes.js              # Gemini AI & heuristic explanation routes
│   │   ├── dashboardRoutes.js       # Dynamic summary stats routes
│   │   ├── datasetRoutes.js         # Compound catalog & CSV export routes
│   │   ├── historyRoutes.js         # Screening history archive routes
│   │   ├── mlRoutes.js              # ML metrics, inference & retraining routes
│   │   └── screenRoutes.js          # SMILES validation & screening routes
│   ├── services/
│   │   ├── chemistryCalculator.js   # In-silico SMILES parser & fallback calculator
│   │   ├── geminiService.js         # Gemini API integration & domain expert fallback
│   │   ├── mlService.js             # Pure JavaScript Logistic Regression Classifier
│   │   ├── pubchemService.js        # PubChem PUG REST API client
│   │   ├── screeningEngine.js       # Lipinski Rule of 5 & Veber evaluation engine
│   │   └── storageService.js        # File-based persistence & CSV generation
│   └── server.js                    # Express application entry point
├── data/
│   ├── benchmark_ml_dataset.json    # Curated training/testing dataset for ML model
│   ├── history.json                 # Persistent screening archive
│   └── sample_drugs.json            # Reference pharmaceutical dataset
├── frontend/
│   ├── assets/
│   │   └── logo.svg                 # Application favicon
│   ├── css/
│   │   └── style.css                # Futuristic dark navy biotech styling
│   ├── js/
│   │   ├── api.js                   # Frontend API client
│   │   ├── app.js                   # Main application coordinator & navigation
│   │   ├── charts.js                # Canvas Donut, Bar & Radar chart renderers
│   │   ├── dataset.js               # Dataset explorer & filtering
│   │   ├── dna-canvas.js            # Animated 3D-projected DNA double-helix
│   │   ├── history.js               # Screening history management
│   │   ├── ml-engine.js             # ML metrics, confusion matrix & predictor
│   │   └── screening.js             # Screening module & AI explanations
│   └── index.html                   # Single-page application interface
├── .env.example                     # Environment configuration template
├── .gitignore                       # Git ignore rules
├── .dockerignore                    # Docker ignore build context rules
├── Dockerfile                       # Multi-stage production container manifest
├── docker-compose.yml               # Production container composition with persistence
├── package.json                     # Project manifest and scripts
├── package-lock.json                # Locked dependency tree
├── test/
│   └── test-all.js                  # Automated 30-point unit & integration test suite
└── README.md                        # Platform documentation
```

---

## 🚀 Installation & Execution

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended; v20+ / v26 supported)
- npm (Node Package Manager)

### 1. Clone or Open the Repository
```bash
git clone https://github.com/your-username/pharmascreen-ai.git
cd pharmascreen-ai
```

### 2. Install Dependencies
```bash
npm install
```
*(On Windows PowerShell, use `npm.cmd install` if script execution policies apply).*

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and set your preferred port and optional Gemini API key:
```env
PORT=3000
NODE_ENV=development

# Optional: Add your Gemini API key to enable live Google Gemini explanations:
# (If left empty, the built-in domain heuristic engine will seamlessly generate explanations)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Application
Start the Node.js server:
```bash
npm start
```

### 5. Run Automated Tests
Execute the 30-point unit and integration test suite:
```bash
npm test
```

### 6. Access the Dashboard
Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 🐳 Production Docker Deployment

PharmaScreen AI includes a production-grade multi-stage Dockerfile and Docker Compose configuration optimized for security, small image footprint (~120MB), and persistent storage.

### Option A: Using Docker Compose (Recommended)

1. **Start the production container in detached mode:**
   ```bash
   docker compose up -d --build
   ```

2. **Verify container health and logs:**
   ```bash
   docker compose ps
   docker compose logs -f
   ```

3. **Data persistence:**
   The `./data` volume is mounted automatically to `/app/data` inside the container, preserving screening history and custom compound archives across container updates and restarts.

4. **Stop the container:**
   ```bash
   docker compose down
   ```

### Option B: Using Standalone Docker CLI

1. **Build the production image:**
   ```bash
   docker build -t pharmascreen-ai:latest .
   ```

2. **Run the container with persistent storage:**
   ```bash
   docker run -d \
     --name pharmascreen-ai \
     --restart unless-stopped \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e GEMINI_API_KEY="" \
     -v "$(pwd)/data:/app/data" \
     pharmascreen-ai:latest
   ```

3. **Check container status and healthcheck:**
   ```bash
   docker ps -f name=pharmascreen-ai
   ```

---

## 🔬 Scientific Rules & Methodology

### Lipinski's Rule of Five
Published in 1997 by Christopher A. Lipinski at Pfizer, the rule states that poor absorption or permeation is more likely when there are:
- More than 5 H-bond donors (expressed as the sum of OHs and NHs);
- Molecular weight is over 500 Da;
- LogP is over 5;
- More than 10 H-bond acceptors (expressed as the sum of Ns and Os).

### Veber's Bioavailability Extension
Published in 2002 by Daniel Veber at GlaxoSmithKline:
- Rotatable bond count $\le 10$ and polar surface area $\le 140\text{ \AA}^2$ associate with high oral bioavailability in animal models.

---

## 🛡️ License
MIT License. Created for educational and computational research demonstration purposes.
