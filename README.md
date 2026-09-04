# MoSJE NHAA 14566 Distress Prediction & Monitoring System
### AI-Powered Dynamic Mental Health Monitoring for Atrocity Victims (SIH Problem Statement ID: 26094)

For the comprehensive system manual, feature specifications, architecture diagrams, and testing guides, please refer to:
📖 **[SYSTEM_FEATURES_AND_WORKINGS.md](file:///c:/Users/Animesh%20Tripathi/Desktop/SIH-26/SYSTEM_FEATURES_AND_WORKINGS.md)**

---

## ⚡ Quick Start (1-Command Launch)

To start the **FastAPI Backend**, **React Counselor Dashboard**, and **Telegram Voice Bot** together:

```bash
python run_project.py
```

* 🌐 **Counselor Dashboard:** [http://localhost:5173](http://localhost:5173)
* 🔌 **FastAPI REST API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* 📱 **Telegram Voice & Text Bot:** [@nhaa_14566_sih_bot](https://t.me/nhaa_14566_sih_bot)

---

## 🧪 Run Automated Tests

```bash
# Test all 6 LangGraph agents
python test_individual_agents.py

# Test end-to-end multi-turn pipeline & database
python test_pipeline.py
```
