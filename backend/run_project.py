"""
Master Project Runner for SIH 26094
Launches all services in parallel:
1. FastAPI Backend (Port 8000)
2. React Vite Frontend (Port 5173)
3. Telegram Voice & Text Support Bot
"""
import sys
import subprocess
import time
import os
from pathlib import Path

# Ensure clean UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).parent.parent.resolve()
BACKEND_DIR = Path(__file__).parent.resolve()
FRONTEND_DIR = ROOT_DIR / "frontend"

def main():
    print("=" * 75)
    print("🚀 STARTING MoSJE • NHAA 14566 DISTRESS PREDICTION SYSTEM")
    print("=" * 75)

    processes = []

    try:
        # 1. Start FastAPI Backend
        print("▶️ [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
        backend_cmd = [sys.executable, "-m", "uvicorn", "backend.api:api", "--host", "127.0.0.1", "--port", "8000"]
        backend_proc = subprocess.Popen(backend_cmd, cwd=str(ROOT_DIR))
        processes.append(("FastAPI Backend", backend_proc))
        time.sleep(2)

        # 2. Start React Frontend
        print("▶️ [2/3] Starting React Dashboard on http://localhost:5173 ...")
        # In Windows, npm is npm.cmd
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        frontend_cmd = [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"]
        frontend_proc = subprocess.Popen(frontend_cmd, cwd=str(FRONTEND_DIR), shell=True)
        processes.append(("React Frontend", frontend_proc))
        time.sleep(2)

        # 3. Start Telegram Bot
        print("▶️ [3/3] Starting Telegram Voice Bot (@nhaa_14566_sih_bot) ...")
        bot_cmd = [sys.executable, "-m", "backend.telegram_bot"]
        bot_proc = subprocess.Popen(bot_cmd, cwd=str(ROOT_DIR))
        processes.append(("Telegram Bot", bot_proc))

        print("\n" + "=" * 75)
        print("🎉 ALL SYSTEMS ARE ONLINE AND READY!")
        print("=" * 75)
        print("🌐 React Counselor Dashboard : http://localhost:5173")
        print("🔌 FastAPI REST API & Docs    : http://127.0.0.1:8000/docs")
        print("📱 Telegram Voice Support Bot : https://t.me/nhaa_14566_sih_bot")
        print("=" * 75)
        print("Press Ctrl+C anytime to stop all services.\n")

        # Keep running and monitor
        while True:
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"⚠️ {name} terminated with code {proc.returncode}")
            time.sleep(2)

    except KeyboardInterrupt:
        print("\n🛑 Stopping all services...")
        for name, proc in processes:
            try:
                proc.terminate()
            except Exception:
                pass
        print("✅ All services stopped.")

if __name__ == "__main__":
    main()
