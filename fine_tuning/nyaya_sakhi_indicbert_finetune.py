"""
╔══════════════════════════════════════════════════════════════════════╗
║   NYAYA SAKHI — IndicBERTv2 Crisis Distress Classifier               ║
║   Fine-Tuning Notebook (Run on Kaggle with P100 GPU)                 ║
║                                                                      ║
║   Base Model : ai4bharat/IndicBERTv2-MLM-only (278M params)          ║
║   Languages  : 24 Indian languages + English + Hinglish              ║
║   Task       : 4-class crisis risk classification                    ║
║     Label 0  → Routine   (0–29%  distress)                           ║
║     Label 1  → Watch     (30–59% distress)                           ║
║     Label 2  → Urgent    (60–84% distress)                           ║
║     Label 3  → Critical  (85–100% distress)                          ║
║                                                                      ║
║   HOW TO USE ON KAGGLE:                                              ║
║   1. Go to kaggle.com → New Notebook                                 ║
║   2. Settings → Accelerator → GPU P100 (free)                        ║
║   3. Paste this script OR add as a .py file                          ║
║   4. Add HF_TOKEN as Kaggle Secret (Settings → Add-ons → Secrets)   ║
║   5. Click "Run All"                                                 ║
╚══════════════════════════════════════════════════════════════════════╝
"""

# ═══════════════════════════════════════════════════════════════════════
# CELL 1 — INSTALL DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════
# Run this cell first. It installs everything needed.

import subprocess
subprocess.run(["pip", "install", "-q",
    "transformers==4.44.0",
    "datasets==2.21.0",
    "accelerate==0.34.0",
    "scikit-learn",
    "pandas",
    "numpy",
    "torch",
    "huggingface_hub",
    "sentencepiece",          # Required for IndicBERT tokenizer
    "protobuf",
    "seqeval",
    "matplotlib",
    "seaborn"
])

print("✅ All dependencies installed")


# ═══════════════════════════════════════════════════════════════════════
# CELL 2 — IMPORTS & GPU CHECK
# ═══════════════════════════════════════════════════════════════════════

import os
import re
import json
import random
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
warnings.filterwarnings("ignore")

import torch
from torch.utils.data import Dataset

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
    DataCollatorWithPadding,
)
from datasets import load_dataset, Dataset as HFDataset, DatasetDict, concatenate_datasets
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    confusion_matrix, ConfusionMatrixDisplay
)
from huggingface_hub import login

# ── GPU Check ──────────────────────────────────────────────────────────
if torch.cuda.is_available():
    gpu_name = torch.cuda.get_device_name(0)
    gpu_mem  = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"✅ GPU: {gpu_name} | VRAM: {gpu_mem:.1f} GB")
else:
    print("⚠️  NO GPU DETECTED — Go to Settings → Accelerator → P100 GPU")

# ── Reproducibility ────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

# ── Config ─────────────────────────────────────────────────────────────
MODEL_NAME     = "ai4bharat/IndicBERTv2-MLM-only"
OUTPUT_DIR     = "./nyaya-sakhi-indicbert"
HF_REPO_NAME   = "nyaya-sakhi-crisis-indicbert"   # Change to your HF username/repo
MAX_LEN        = 128
BATCH_SIZE     = 16
EPOCHS         = 5
LR             = 2e-5
WEIGHT_DECAY   = 0.01
NUM_LABELS     = 4

LABEL2ID = {"Routine": 0, "Watch": 1, "Urgent": 2, "Critical": 3}
ID2LABEL = {0: "Routine", 1: "Watch", 2: "Urgent", 3: "Critical"}

print(f"\n📌 Base Model  : {MODEL_NAME}")
print(f"📌 Output Dir  : {OUTPUT_DIR}")
print(f"📌 Labels      : {list(LABEL2ID.keys())}")


# ═══════════════════════════════════════════════════════════════════════
# CELL 3 — DOWNLOAD & LOAD PUBLIC DATASETS FROM HUGGINGFACE
# ═══════════════════════════════════════════════════════════════════════
# We pull 3 free, public English crisis datasets and merge them.
# They will be mapped to our 4-tier crisis labels.

print("\n" + "="*60)
print("📥 STEP 1: DOWNLOADING DATASETS FROM HUGGINGFACE HUB")
print("="*60)

frames = []

# ── Dataset 1: Suicide Watch (Reddit) ──────────────────────────────────
# Columns: text, class  ("suicide" / "non-suicide")
print("\n[1/3] Downloading: vibhorag101/suicide-watch ...")
try:
    ds1 = load_dataset("vibhorag101/suicide-watch", split="train")
    df1 = ds1.to_pandas()[["text", "class"]].dropna()
    df1.columns = ["text", "raw_label"]
    # suicide → Critical (3), non-suicide → Routine (0)
    df1["label"] = df1["raw_label"].map({"suicide": 3, "non-suicide": 0})
    df1 = df1.dropna(subset=["label"])
    # Balance: take 3000 suicide + 3000 non-suicide
    pos = df1[df1["label"] == 3].sample(min(3000, len(df1[df1["label"]==3])), random_state=SEED)
    neg = df1[df1["label"] == 0].sample(min(3000, len(df1[df1["label"]==0])), random_state=SEED)
    df1 = pd.concat([pos, neg])
    frames.append(df1[["text", "label"]])
    print(f"   ✅ Loaded {len(df1)} rows  | Labels: suicide→3, non-suicide→0")
except Exception as e:
    print(f"   ⚠️  Failed: {e}")

# ── Dataset 2: Dreaddit (Stress Detection) ─────────────────────────────
# Columns: text, label  (1=stress / 0=no stress)
print("\n[2/3] Downloading: dair-ai/dreaddit ...")
try:
    ds2_train = load_dataset("dair-ai/dreaddit", split="train")
    ds2_test  = load_dataset("dair-ai/dreaddit", split="test")
    df2 = pd.concat([ds2_train.to_pandas(), ds2_test.to_pandas()])
    df2 = df2[["text", "label"]].dropna()
    # stress (1) → Watch (1), no-stress (0) → Routine (0)
    df2["label"] = df2["label"].map({1: 1, 0: 0})
    frames.append(df2[["text", "label"]])
    print(f"   ✅ Loaded {len(df2)} rows  | Labels: stress→1, no_stress→0")
except Exception as e:
    print(f"   ⚠️  Failed: {e}")

# ── Dataset 3: Mental Health Text Classification ────────────────────────
# Columns: statement, status (Normal/Depression/Suicidal/Anxiety/Stress/...)
print("\n[3/3] Downloading: solomonk/mental_health_reddit_posts ...")
try:
    ds3 = load_dataset("solomonk/mental_health_reddit_posts", split="train")
    df3 = ds3.to_pandas()
    # Map various labels to our 4-tier system
    label_map_3 = {
        "Normal":          0,   # Routine
        "Anxiety":         1,   # Watch
        "Stress":          1,   # Watch
        "Depression":      2,   # Urgent
        "Bipolar":         2,   # Urgent
        "Personality disorder": 2,
        "Suicidal":        3,   # Critical
        "PTSD":            2,
    }
    # Try both possible column names
    text_col   = "post" if "post" in df3.columns else "text" if "text" in df3.columns else None
    label_col  = "label" if "label" in df3.columns else "status" if "status" in df3.columns else None
    if text_col and label_col:
        df3 = df3[[text_col, label_col]].dropna()
        df3.columns = ["text", "raw_label"]
        df3["label"] = df3["raw_label"].map(label_map_3)
        df3 = df3.dropna(subset=["label"])
        df3["label"] = df3["label"].astype(int)
        frames.append(df3[["text", "label"]])
        print(f"   ✅ Loaded {len(df3)} rows")
    else:
        print(f"   ⚠️  Unexpected columns: {df3.columns.tolist()}")
except Exception as e:
    print(f"   ⚠️  Failed: {e}")

# ── Merge all datasets ──────────────────────────────────────────────────
if frames:
    df_en = pd.concat(frames, ignore_index=True)
    df_en["label"] = df_en["label"].astype(int)
    print(f"\n✅ Total English samples loaded: {len(df_en)}")
    print(df_en["label"].value_counts().rename(index=ID2LABEL))
else:
    print("⚠️  No datasets loaded — creating synthetic data only")
    df_en = pd.DataFrame(columns=["text", "label"])


# ═══════════════════════════════════════════════════════════════════════
# CELL 4 — BUILD INDIAN LANGUAGE SYNTHETIC DATASET
# ═══════════════════════════════════════════════════════════════════════
# Covers Hindi, Bengali, Tamil, Telugu, Marathi, Kannada, Gujarati,
# Punjabi, Malayalam, Odia, Assamese, Urdu, Hinglish (Roman)

print("\n" + "="*60)
print("🏗️  STEP 2: BUILDING INDIAN LANGUAGE CRISIS DATASET")
print("="*60)

INDIAN_CRISIS_DATA = [

    # ────────────────────────────────────────────────────────────────
    # LABEL 0 — ROUTINE (Stable, everyday check-ins)
    # ────────────────────────────────────────────────────────────────
    # Hindi
    {"text": "Namaste, main theek hoon aaj", "label": 0},
    {"text": "Sab kuch thik chal raha hai", "label": 0},
    {"text": "Aaj mausam accha hai", "label": 0},
    {"text": "Case ki agali date kab hai", "label": 0},
    {"text": "Main apne ghar mein hoon", "label": 0},
    {"text": "Mujhe koi problem nahi hai", "label": 0},
    {"text": "Hamara parivaar theek hai", "label": 0},
    {"text": "Office se abhi aaya hun", "label": 0},

    # Bengali
    {"text": "Aami bhalo achi, shukriya", "label": 0},
    {"text": "Amar kono samasya nei", "label": 0},
    {"text": "Aaj amader bari shanti aache", "label": 0},

    # Tamil
    {"text": "Vanakkam, naan nalam irukiren", "label": 0},
    {"text": "Ennaku ethuvum problem illai", "label": 0},
    {"text": "Inru maalamtham nalladu", "label": 0},

    # Telugu
    {"text": "Namaskaram, nenu baagunnanu", "label": 0},
    {"text": "Naaku emee problem ledu", "label": 0},

    # Marathi
    {"text": "Namaste, mi theek ahe", "label": 0},
    {"text": "Mala kahi problem nahi", "label": 0},
    {"text": "Aaj sara din gela bara", "label": 0},

    # Kannada
    {"text": "Namaskara, naanu chennagiddini", "label": 0},
    {"text": "Nanna heege yenu problem illa", "label": 0},

    # Gujarati
    {"text": "Kem cho, hu saras chhu", "label": 0},
    {"text": "Mane koi takliph nathi", "label": 0},

    # Punjabi
    {"text": "Sat sri akal, main theek haan", "label": 0},
    {"text": "Sab kuch theek thaak hai", "label": 0},

    # Hinglish (Roman Hindi)
    {"text": "Hello bhai, sab theek hai", "label": 0},
    {"text": "Aaj kuch khaas nahi hua", "label": 0},
    {"text": "All good, bas thoda kaam zyada tha", "label": 0},

    # ────────────────────────────────────────────────────────────────
    # LABEL 1 — WATCH (Mild anxiety, worry, legal stress)
    # ────────────────────────────────────────────────────────────────
    # Hindi
    {"text": "Mujhe thoda dar lag raha hai", "label": 1},
    {"text": "Case mein problem aa gayi hai", "label": 1},
    {"text": "Koi sun nahi raha mujhe", "label": 1},
    {"text": "Neend nahi aa rahi kafi dino se", "label": 1},
    {"text": "Court ki tarikh aane se tension hai", "label": 1},
    {"text": "Parivaar mein tension hai", "label": 1},
    {"text": "Mujhe anxiety ho rahi hai", "label": 1},
    {"text": "Bahut ghabra raha hun aajkal", "label": 1},
    {"text": "Main akela feel kar raha hun", "label": 1},
    {"text": "Kisi se baat nahi kar pa raha", "label": 1},

    # Bengali
    {"text": "Aami bhoy paachchhi ektu", "label": 1},
    {"text": "Aamaar case niey chintit aachi", "label": 1},
    {"text": "Ratey ghum hoy na", "label": 1},

    # Tamil
    {"text": "Enakku bayam aagudhu", "label": 1},
    {"text": "Case pathi kevalama iruku", "label": 1},
    {"text": "Thokkam illama irukiren", "label": 1},

    # Telugu
    {"text": "Naaku bhayam ga undi", "label": 1},
    {"text": "Case valla tension ga undi", "label": 1},
    {"text": "Nidra pattaledu kaligipotundi", "label": 1},

    # Marathi
    {"text": "Mala bhiti vatate", "label": 1},
    {"text": "Case chya baddal turung ahe", "label": 1},
    {"text": "Mala anxiety hoat ahe", "label": 1},

    # Kannada
    {"text": "Nange bayave aagthidhe", "label": 1},
    {"text": "Nidde baruttilla", "label": 1},

    # Hinglish
    {"text": "Yaar bahut dar lag raha hai case se", "label": 1},
    {"text": "Tension mein hun, kuch samajh nahi aa raha", "label": 1},
    {"text": "Akela feel ho raha hai, koi nahi hai", "label": 1},

    # ────────────────────────────────────────────────────────────────
    # LABEL 2 — URGENT (Active threats, stalking, intimidation)
    # ────────────────────────────────────────────────────────────────
    # Hindi
    {"text": "Koi mera peecha kar raha hai please help", "label": 2},
    {"text": "Ghar ke bahar kuch log khare hain", "label": 2},
    {"text": "Mujhe dhamki di gayi hai", "label": 2},
    {"text": "Mujhe maar dene ki dhamki di hai unhone", "label": 2},
    {"text": "Bahar wale log mujhe dara rahe hain", "label": 2},
    {"text": "Koi raat ko ghar ke bahar ghoomta hai", "label": 2},
    {"text": "Padosi ke log mujhe pareshan kar rahe hain", "label": 2},
    {"text": "Mujhe force kiya ja raha hai kuch karne ke liye", "label": 2},
    {"text": "Log mujhpar pressure daal rahe hain case wapas lene ka", "label": 2},
    {"text": "Unke aadmi hamare gaon mein ghoom rahe hain", "label": 2},

    # Bengali
    {"text": "Keu aamar pichu nischche", "label": 2},
    {"text": "Amare barite lok ache, bhoy lagche", "label": 2},
    {"text": "Amake dhamki deoya hochhe", "label": 2},

    # Tamil
    {"text": "Enna kolaipanna pakuranaa", "label": 2},
    {"text": "En veettukku veliye aalu irukkaanga", "label": 2},
    {"text": "Enakku dhamki kuduthaanga", "label": 2},

    # Telugu
    {"text": "Naaku threat chesaru, bhayam ga undi", "label": 2},
    {"text": "Illu duramga gaundlu thiruguthunnaru", "label": 2},
    {"text": "Naa venaka vachhe vaallunnaru", "label": 2},

    # Marathi
    {"text": "Mala threat dila ahe, mala bhiti vatate", "label": 2},
    {"text": "Ghari baher log ubhe ahet", "label": 2},
    {"text": "Maza peecha kela jaat ahe", "label": 2},

    # Kannada
    {"text": "Naanu safety le, mane hege iddare jackals", "label": 2},
    {"text": "Yaaro nanna mane samipa iruttare", "label": 2},

    # Hinglish
    {"text": "Koi mera picha kar raha hai bhai help karo", "label": 2},
    {"text": "Ghar ke samne kuch goonde khade hain", "label": 2},
    {"text": "Unhone warning di hai agar case nahi hataya to", "label": 2},
    {"text": "Please help karo, mujhe unsafe feel ho raha hai", "label": 2},

    # Urdu
    {"text": "Mujhe dhamki di gayi hai, bahut darr lag raha hai", "label": 2},
    {"text": "Ghar ke bahar log khade hain jo mujhe dara rahe hain", "label": 2},

    # ────────────────────────────────────────────────────────────────
    # LABEL 3 — CRITICAL (Active violence, kidnapping, life threat)
    # ────────────────────────────────────────────────────────────────
    # Hindi
    {"text": "Bachao koi maar raha hai mujhe", "label": 3},
    {"text": "Jaan se maarne ki koshish ki", "label": 3},
    {"text": "Mujhe kidnap karne ki koshish ki", "label": 3},
    {"text": "Unho ne meri beti ko pakad liya please help", "label": 3},
    {"text": "Koi churi leke mujhpar aaya", "label": 3},
    {"text": "Mujhe goli maarne ki dhamki di", "label": 3},
    {"text": "Main lahu mein hun, koi aao", "label": 3},
    {"text": "Please 112 ko call karo abhi", "label": 3},
    {"text": "Mujhe attack kiya gaya hai sos", "label": 3},
    {"text": "Mar jaaunga agar aaj nahi nikla", "label": 3},
    {"text": "Abhi abhi mujhe maara gaon ke log", "label": 3},
    {"text": "Meri beti ko le gaye hain log please help police", "label": 3},

    # Bengali
    {"text": "Amake maar te chaicche bachao", "label": 3},
    {"text": "Amake kidnap kore niye geche", "label": 3},
    {"text": "SOS please help korun", "label": 3},

    # Tamil
    {"text": "Enna kolla pakkuranaa save me", "label": 3},
    {"text": "En pillai yai kidnap panniyaanga please help", "label": 3},
    {"text": "Enakku adi vaangittaanga help koopidu", "label": 3},

    # Telugu
    {"text": "Naaku chompeyyadaaniki try chestunnadu", "label": 3},
    {"text": "Police ni pilavaandi please abhi", "label": 3},
    {"text": "Naaku attack chesaru, help kavali", "label": 3},

    # Marathi
    {"text": "Mala maar bsat ahet, bachwa mala", "label": 3},
    {"text": "Mala kidnap kele, please madad kara", "label": 3},
    {"text": "SOS madad kara laukar", "label": 3},

    # Kannada
    {"text": "Nannu kollattu try maduttiddaare, help maadi", "label": 3},
    {"text": "Nannu kidnap maadiddaare", "label": 3},

    # Hinglish
    {"text": "Bhai bachao koi maar raha hai please 112", "label": 3},
    {"text": "I am not feeling good some try to kidnap me please help", "label": 3},
    {"text": "Someone is trying to kill me please call police", "label": 3},
    {"text": "Mere ghar mein ghus ke attack kiya, help karo abhi", "label": 3},
    {"text": "SOS madad karo jaan ka khatara hai", "label": 3},
    {"text": "Please help mujhe abduct karne ki koshish ho rahi hai", "label": 3},

    # Urdu
    {"text": "Mujhe qatl karne ki koshish ho rahi hai bachao", "label": 3},
    {"text": "Abhi koi mujh par hamla kar raha hai SOS", "label": 3},

    # Odia
    {"text": "Mote marichhu bachao please", "label": 3},
    {"text": "Mote dhara karichi kidnap", "label": 3},

    # Malayalam
    {"text": "Enne konnu kalavaan nokkunu help cheyyu", "label": 3},
    {"text": "Enne thadavaan try cheythu police vilichu", "label": 3},

    # Punjabi
    {"text": "Mainu maar rehe ne bachao please", "label": 3},
    {"text": "Oye help karo kidnappers ne pakad liya", "label": 3},

    # Gujarati
    {"text": "Mane maari naakhu chhe help karo", "label": 3},
    {"text": "Tamaro madad joi chhe, bachavo", "label": 3},
]

df_in = pd.DataFrame(INDIAN_CRISIS_DATA)
df_in["label"] = df_in["label"].astype(int)

# Augment: simple repetition with minor variations to boost minority classes
def augment_text(text):
    """Minimal augmentation: random word drop."""
    words = text.split()
    if len(words) > 4:
        drop_idx = random.randint(0, len(words)-1)
        words.pop(drop_idx)
    return " ".join(words)

# Augment Critical 3x, Urgent 2x
aug_rows = []
for _, row in df_in.iterrows():
    if row["label"] == 3:
        for _ in range(3):
            aug_rows.append({"text": augment_text(row["text"]), "label": 3})
    elif row["label"] == 2:
        for _ in range(2):
            aug_rows.append({"text": augment_text(row["text"]), "label": 2})

df_aug = pd.DataFrame(aug_rows)
df_in  = pd.concat([df_in, df_aug], ignore_index=True)

print(f"✅ Indian language samples : {len(df_in)}")
print(df_in["label"].value_counts().rename(index=ID2LABEL))


# ═══════════════════════════════════════════════════════════════════════
# CELL 5 — MERGE, CLEAN & BALANCE DATASETS
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("🧹 STEP 3: CLEANING & BALANCING")
print("="*60)

# ── Merge ──
df_all = pd.concat([df_en, df_in], ignore_index=True)

# ── Clean ──
def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.strip()
    # Remove URLs
    text = re.sub(r"http\S+|www\.\S+", "", text)
    # Remove email addresses
    text = re.sub(r"\S+@\S+\.\S+", "[EMAIL]", text)
    # Remove phone numbers
    text = re.sub(r"\b\d{10,12}\b", "[PHONE]", text)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Remove completely empty or very short
    if len(text.split()) < 2:
        return ""
    # Truncate very long texts (IndicBERT max is 512 tokens)
    words = text.split()
    if len(words) > 100:
        text = " ".join(words[:100])
    return text

df_all["text"] = df_all["text"].apply(clean_text)
df_all = df_all[df_all["text"].str.len() > 5].copy()
df_all = df_all.drop_duplicates(subset=["text"])
df_all = df_all.dropna(subset=["text", "label"])
df_all["label"] = df_all["label"].astype(int)

print(f"\nAfter cleaning: {len(df_all)} samples")
print("\nClass distribution BEFORE balancing:")
print(df_all["label"].value_counts().rename(index=ID2LABEL))

# ── Class Balancing (cap majority, oversample minority) ──
TARGET_PER_CLASS = 2500
balanced_frames = []
for label_id in [0, 1, 2, 3]:
    subset = df_all[df_all["label"] == label_id]
    if len(subset) > TARGET_PER_CLASS:
        # Undersample majority
        subset = subset.sample(TARGET_PER_CLASS, random_state=SEED)
    elif len(subset) < TARGET_PER_CLASS:
        # Oversample minority
        multiplier = (TARGET_PER_CLASS // len(subset)) + 1
        subset = pd.concat([subset] * multiplier).sample(TARGET_PER_CLASS, random_state=SEED)
    balanced_frames.append(subset)

df_final = pd.concat(balanced_frames, ignore_index=True).sample(frac=1, random_state=SEED)

print(f"\nAfter balancing: {len(df_final)} samples")
print("\nClass distribution AFTER balancing:")
print(df_final["label"].value_counts().rename(index=ID2LABEL))

# ── Visualize ──
plt.figure(figsize=(8, 4))
df_final["label"].value_counts().sort_index().rename(index=ID2LABEL).plot(kind="bar", color=["#4CAF50","#FFC107","#FF9800","#F44336"])
plt.title("Training Data Distribution — Crisis Risk Labels", fontsize=14)
plt.xlabel("Risk Tier")
plt.ylabel("Sample Count")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig("class_distribution.png", dpi=120)
plt.show()
print("✅ Plot saved: class_distribution.png")


# ═══════════════════════════════════════════════════════════════════════
# CELL 6 — TOKENIZE WITH IndicBERTv2
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("🔤 STEP 4: LOADING IndicBERTv2 TOKENIZER")
print("="*60)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
print(f"✅ Tokenizer loaded: {MODEL_NAME}")
print(f"   Vocab size    : {tokenizer.vocab_size}")
print(f"   Max length    : {tokenizer.model_max_length}")

# ── Test tokenizer on Indian languages ──
test_samples = [
    "Bachao koi maar raha hai mujhe",          # Hindi Critical
    "Enna kolla pakkuranaa save me",            # Tamil Critical
    "Naaku bhayam ga undi",                     # Telugu Watch
    "I am not feeling good some try to kidnap me",  # Hinglish Critical
]

print("\n🔍 Tokenizer test on Indian language samples:")
for s in test_samples:
    tokens = tokenizer.tokenize(s)
    print(f"   Input  : {s}")
    print(f"   Tokens : {tokens[:12]}...")
    print()

# ── Train / Val / Test Split ──
train_df, temp_df = train_test_split(
    df_final, test_size=0.25, stratify=df_final["label"], random_state=SEED
)
val_df, test_df = train_test_split(
    temp_df, test_size=0.4, stratify=temp_df["label"], random_state=SEED
)

print(f"✅ Split complete:")
print(f"   Train : {len(train_df)} samples")
print(f"   Val   : {len(val_df)} samples")
print(f"   Test  : {len(test_df)} samples")

# ── Tokenize ──
def tokenize_batch(batch):
    return tokenizer(
        batch["text"],
        padding="max_length",
        truncation=True,
        max_length=MAX_LEN,
    )

train_hf = HFDataset.from_pandas(train_df.reset_index(drop=True))
val_hf   = HFDataset.from_pandas(val_df.reset_index(drop=True))
test_hf  = HFDataset.from_pandas(test_df.reset_index(drop=True))

train_hf = train_hf.map(tokenize_batch, batched=True)
val_hf   = val_hf.map(tokenize_batch, batched=True)
test_hf  = test_hf.map(tokenize_batch, batched=True)

# Rename label column
train_hf = train_hf.rename_column("label", "labels")
val_hf   = val_hf.rename_column("label", "labels")
test_hf  = test_hf.rename_column("label", "labels")

# Set torch format
cols = ["input_ids", "attention_mask", "labels"]
train_hf.set_format("torch", columns=cols)
val_hf.set_format("torch", columns=cols)
test_hf.set_format("torch", columns=cols)

print("✅ Tokenization complete")


# ═══════════════════════════════════════════════════════════════════════
# CELL 7 — LOAD MODEL & CONFIGURE TRAINING
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("🤖 STEP 5: LOADING IndicBERTv2 MODEL")
print("="*60)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=NUM_LABELS,
    id2label=ID2LABEL,
    label2id=LABEL2ID,
    ignore_mismatched_sizes=True,
)

total_params = sum(p.numel() for p in model.parameters())
trainable    = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"✅ Model loaded: {MODEL_NAME}")
print(f"   Total params     : {total_params:,}")
print(f"   Trainable params : {trainable:,}")

# ── Metrics ──
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions    = np.argmax(logits, axis=-1)
    return {
        "accuracy"  : accuracy_score(labels, predictions),
        "f1_macro"  : f1_score(labels, predictions, average="macro"),
        "f1_critical": f1_score(labels, predictions, labels=[3], average="macro"),
    }

# ── Training Arguments ──
training_args = TrainingArguments(
    output_dir                  = OUTPUT_DIR,
    overwrite_output_dir        = True,
    num_train_epochs            = EPOCHS,
    per_device_train_batch_size = BATCH_SIZE,
    per_device_eval_batch_size  = BATCH_SIZE,
    learning_rate               = LR,
    weight_decay                = WEIGHT_DECAY,
    warmup_ratio                = 0.1,
    evaluation_strategy         = "epoch",
    save_strategy               = "epoch",
    load_best_model_at_end      = True,
    metric_for_best_model       = "f1_macro",
    greater_is_better           = True,
    logging_steps               = 50,
    save_total_limit            = 2,
    fp16                        = torch.cuda.is_available(),   # FP16 on GPU
    seed                        = SEED,
    report_to                   = "none",     # Disable wandb
    push_to_hub                 = False,
)

# ── Weighted Loss for Class Balance ──
# Even after balancing, Critical class needs extra penalty
class WeightedTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits  = outputs.logits
        # Weights: Routine=1, Watch=1.2, Urgent=1.5, Critical=2.0
        weight  = torch.tensor([1.0, 1.2, 1.5, 2.0]).to(logits.device)
        loss_fn = torch.nn.CrossEntropyLoss(weight=weight)
        loss    = loss_fn(logits, labels)
        return (loss, outputs) if return_outputs else loss

trainer = WeightedTrainer(
    model          = model,
    args           = training_args,
    train_dataset  = train_hf,
    eval_dataset   = val_hf,
    compute_metrics= compute_metrics,
    callbacks      = [EarlyStoppingCallback(early_stopping_patience=2)],
)

print("\n✅ Trainer configured with:")
print(f"   Epochs      : {EPOCHS}")
print(f"   Batch size  : {BATCH_SIZE}")
print(f"   Learning rate: {LR}")
print(f"   Loss weights: Routine×1.0 Watch×1.2 Urgent×1.5 Critical×2.0")
print(f"   FP16        : {torch.cuda.is_available()}")


# ═══════════════════════════════════════════════════════════════════════
# CELL 8 — TRAIN
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("🚀 STEP 6: TRAINING — ETA ~25-40 mins on Kaggle P100")
print("="*60)

train_result = trainer.train()

# Save final model locally
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print("\n✅ Training complete!")
print(f"   Final loss  : {train_result.training_loss:.4f}")
print(f"   Total steps : {train_result.global_step}")


# ═══════════════════════════════════════════════════════════════════════
# CELL 9 — EVALUATE ON TEST SET
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("📊 STEP 7: EVALUATION ON HELD-OUT TEST SET")
print("="*60)

test_results = trainer.predict(test_hf)
preds  = np.argmax(test_results.predictions, axis=-1)
labels = test_results.label_ids

# ── Classification Report ──
print("\nClassification Report:")
print(classification_report(
    labels, preds,
    target_names=["Routine", "Watch", "Urgent", "Critical"]
))

# ── Confusion Matrix ──
cm = confusion_matrix(labels, preds)
disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=["Routine", "Watch", "Urgent", "Critical"]
)
fig, ax = plt.subplots(figsize=(7, 6))
disp.plot(ax=ax, cmap="Blues", colorbar=False)
ax.set_title("Confusion Matrix — IndicBERTv2 Crisis Classifier", fontsize=13)
plt.tight_layout()
plt.savefig("confusion_matrix.png", dpi=120)
plt.show()
print("✅ Saved: confusion_matrix.png")

# ── Live inference test ──
print("\n🔍 LIVE INFERENCE TEST:")
from transformers import pipeline

crisis_pipe = pipeline(
    "text-classification",
    model=model,
    tokenizer=tokenizer,
    device=0 if torch.cuda.is_available() else -1,
)

live_tests = [
    ("Hello, main theek hoon aaj",                          "→ Expected: Routine"),
    ("Case ki tension hai mujhe",                            "→ Expected: Watch"),
    ("Koi mera peecha kar raha hai please help",             "→ Expected: Urgent"),
    ("Bachao koi maar raha hai mujhe",                       "→ Expected: Critical"),
    ("I am not feeling good some try to kidnap me",          "→ Expected: Critical"),
    ("Amake maar te chaicche bachao",                        "→ Expected: Critical (Bengali)"),
    ("Enna kolla pakkuranaa save me",                        "→ Expected: Critical (Tamil)"),
    ("Naaku chompeyyadaaniki try chestunnadu",               "→ Expected: Critical (Telugu)"),
    ("Mla kidnap kele madad kara",                           "→ Expected: Critical (Marathi)"),
    ("Enne konnu kalavaan nokkunu help",                     "→ Expected: Critical (Malayalam)"),
]

SCORE_MAP = {0: "0%", 1: "45%", 2: "85%", 3: "95%"}

for text, expected in live_tests:
    result = crisis_pipe(text[:512])[0]
    label  = result["label"]
    conf   = result["score"]
    score  = SCORE_MAP.get(int(label.split("_")[-1]) if "_" in label else LABEL2ID.get(label, 0), "?")
    print(f"   [{label} {conf:.0%}] Distress≈{score} | {expected}")
    print(f"   Input: {text[:70]}")
    print()


# ═══════════════════════════════════════════════════════════════════════
# CELL 10 — PUSH TO HUGGINGFACE HUB (FREE HOSTING)
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("☁️  STEP 8: PUSH TO HUGGINGFACE HUB")
print("="*60)

# ── Get HF token ──
# On Kaggle: Settings → Add-ons → Secrets → Add HF_TOKEN
try:
    from kaggle_secrets import UserSecretsClient
    secrets = UserSecretsClient()
    HF_TOKEN = secrets.get_secret("HF_TOKEN")
    print("✅ HF Token loaded from Kaggle Secrets")
except Exception:
    # Fallback: set manually
    HF_TOKEN = "hf_YOUR_TOKEN_HERE"   # ← Replace with your HF token
    print("⚠️  Using hardcoded token — replace hf_YOUR_TOKEN_HERE")

login(token=HF_TOKEN)

# ── Push model ──
# The model will be hosted FREE at:
# https://huggingface.co/YOUR_USERNAME/nyaya-sakhi-crisis-indicbert
model.push_to_hub(HF_REPO_NAME, token=HF_TOKEN)
tokenizer.push_to_hub(HF_REPO_NAME, token=HF_TOKEN)

print(f"\n🎉 Model hosted FREE at:")
print(f"   https://huggingface.co/YOUR_USERNAME/{HF_REPO_NAME}")
print(f"\n📌 Use this in your project's config.py:")
print(f'   HF_MODELS["emotion_classifier"] = "YOUR_USERNAME/{HF_REPO_NAME}"')


# ═══════════════════════════════════════════════════════════════════════
# CELL 11 — INTEGRATION CODE FOR NYAYA SAKHI PROJECT
# ═══════════════════════════════════════════════════════════════════════

INTEGRATION_CODE = '''
# ─────────────────────────────────────────────────────────────────────
# Paste this into agents/nlp_agent.py to use your fine-tuned model
# ─────────────────────────────────────────────────────────────────────

from transformers import pipeline as hf_pipeline

# Your fine-tuned model (replace YOUR_USERNAME)
CRISIS_MODEL_ID = "YOUR_USERNAME/nyaya-sakhi-crisis-indicbert"

# Label → distress score mapping (replaces DISTRESS_KEYWORDS)
CRISIS_LABEL_TO_SCORE = {
    "Routine":  0.05,
    "Watch":    0.45,
    "Urgent":   0.85,
    "Critical": 0.95,
}

# Load once at startup
_crisis_pipe = None
def get_crisis_pipeline():
    global _crisis_pipe
    if _crisis_pipe is None:
        _crisis_pipe = hf_pipeline(
            "text-classification",
            model=CRISIS_MODEL_ID,
            tokenizer=CRISIS_MODEL_ID,
            device=-1,       # -1 = CPU (inference is cheap)
            truncation=True,
            max_length=128
        )
    return _crisis_pipe

def analyze_text_distress_v2(text: str) -> dict:
    """
    Use fine-tuned IndicBERTv2 to classify distress risk.
    Covers 24 Indian languages + Hinglish. No hardcoded keywords needed.
    """
    pipe   = get_crisis_pipeline()
    result = pipe(text[:512])[0]
    label  = result["label"]   # "Routine" / "Watch" / "Urgent" / "Critical"
    conf   = result["score"]   # Confidence 0.0 → 1.0
    score  = CRISIS_LABEL_TO_SCORE[label]

    return {
        "distress_score":       score,
        "top_emotions":         [{"label": label.lower(), "score": round(conf, 3)}],
        "distress_severity":    "acute distress" if score >= 0.75 else ("moderate stress" if score >= 0.45 else "routine"),
        "threat_violence_flag": label == "Critical",
        "intimidation_flag":    label in ["Urgent", "Critical"],
        "emergency_help_flag":  label in ["Urgent", "Critical"],
        "hopelessness_flag":    label in ["Watch", "Urgent"],
        "self_harm_cues":       label == "Critical" and conf > 0.90,
        "withdrawal_flag":      label == "Watch" and conf > 0.75,
        "analysis_source":      "indicbertv2_finetuned",
    }
'''

print("\n" + "="*60)
print("📋 INTEGRATION CODE FOR NYAYA SAKHI:")
print("="*60)
print(INTEGRATION_CODE)

# Save to file
with open("integration_nlp_agent.py", "w", encoding="utf-8") as f:
    f.write(INTEGRATION_CODE)
print("\n✅ Integration code saved: integration_nlp_agent.py")
print("   → Copy this function into agents/nlp_agent.py")
print("   → Remove DISTRESS_KEYWORDS (no longer needed!)")
print("\n🎉 FINE-TUNING COMPLETE! IndicBERTv2 is now a crisis classifier.")
